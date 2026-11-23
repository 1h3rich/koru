import type { FutureSavingsPlan, Loan, ReserveMovement, Transaction } from './types'
import { buildPurchaseBatch, getPurchaseBatchSources } from './purchaseBatch'
import { validFutureSavingsPlan } from './futureSavings'

const TRANSACTIONS_KEY = 'koru.transactions.v1'
const RESERVES_KEY = 'koru.reserves.v1'
const LOANS_KEY = 'koru.loans.v1'
const FUTURE_SAVINGS_KEY = 'koru.future-savings.v1'
const DELETIONS_KEY = 'koru.deletions.v1'
const SESSION_TOKEN_KEY = 'koru.cloud.token.v1'
const SESSION_ENCRYPTION_KEY = 'koru.cloud.key.v1'
const KEY_DERIVATION_SALT = 'koru-private-sync-v1'
const KEY_DERIVATION_ITERATIONS = 310_000
const OFFLINE_SESSION = 'offline'
const LOCAL_PASSWORD_HASH = '9ec20861648a786be50248d6014ea97f360a03df3f486502ec36b82093e01c23'

export interface CloudSnapshot {
  transactions: Transaction[]
  reserveMovements: ReserveMovement[]
  loans: Loan[]
  deletions?: DeletionLog
  updatedAt: number
  futureSavings?: FutureSavingsPlan
}

interface DeletionLog {
  transactions: Record<string, number>
  reserveMovements: Record<string, number>
  loans: Record<string, number>
}

interface EncryptedPayload {
  version: 1
  iv: string
  data: string
}

interface SyncResponse {
  token?: string
  found?: boolean
  payload?: EncryptedPayload
  saved?: boolean
  revision?: number
  error?: string
}

export class InvalidPasswordError extends Error {}
export class SyncUnavailableError extends Error {}
class SyncConflictError extends Error {}

let syncQueue: Promise<void> = Promise.resolve()

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function deriveEncryptionKey(password: string): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: new TextEncoder().encode(KEY_DERIVATION_SALT),
    iterations: KEY_DERIVATION_ITERATIONS,
  }, material, 256)
  return bytesToBase64(new Uint8Array(bits))
}

async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function importEncryptionKey(encodedKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', base64ToBytes(encodedKey), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encryptSnapshot(snapshot: CloudSnapshot, encodedKey: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await importEncryptionKey(encodedKey)
  const plaintext = new TextEncoder().encode(JSON.stringify(snapshot))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { version: 1, iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) }
}

async function decryptSnapshot(payload: EncryptedPayload, encodedKey: string): Promise<CloudSnapshot> {
  const key = await importEncryptionKey(encodedKey)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.data),
  )
  return JSON.parse(new TextDecoder().decode(decrypted)) as CloudSnapshot
}

async function callSync(body: Record<string, unknown>, token?: string): Promise<SyncResponse> {
  let response: Response
  try {
    response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new SyncUnavailableError('No hay conexión con Koru.')
  }

  const result = await response.json().catch(() => ({})) as SyncResponse
  if (response.status === 401 && body.action === 'login') throw new InvalidPasswordError()
  if (response.status === 409) throw new SyncConflictError(result.error || 'Hay cambios nuevos en otro dispositivo.')
  if (!response.ok) throw new SyncUnavailableError(result.error || 'No se pudo sincronizar.')
  return result
}

function emptyDeletions(): DeletionLog {
  return { transactions: {}, reserveMovements: {}, loans: {} }
}

function normalizeSnapshot(snapshot: Partial<CloudSnapshot>): CloudSnapshot {
  return {
    transactions: compactTransactions(Array.isArray(snapshot.transactions) ? snapshot.transactions : []),
    reserveMovements: Array.isArray(snapshot.reserveMovements) ? snapshot.reserveMovements : [],
    loans: Array.isArray(snapshot.loans) ? snapshot.loans : [],
    deletions: {
      transactions: snapshot.deletions?.transactions ?? {},
      reserveMovements: snapshot.deletions?.reserveMovements ?? {},
      loans: snapshot.deletions?.loans ?? {},
    },
    updatedAt: snapshot.updatedAt ?? Date.now(),
    futureSavings: validFutureSavingsPlan(snapshot.futureSavings) ? snapshot.futureSavings : undefined,
  }
}

function mergeDeletionLogs(first?: DeletionLog, second?: DeletionLog): DeletionLog {
  const merged = emptyDeletions()
  for (const key of ['transactions', 'reserveMovements', 'loans'] as const) {
    for (const [id, deletedAt] of Object.entries({ ...(first?.[key] ?? {}), ...(second?.[key] ?? {}) })) {
      merged[key][id] = Math.max(first?.[key]?.[id] ?? 0, second?.[key]?.[id] ?? 0, deletedAt)
    }
  }
  return merged
}

function itemVersion(item: { createdAt: number, updatedAt?: number }): number {
  return item.updatedAt ?? item.createdAt
}

function mergeCollection<T extends { id: string, createdAt: number, updatedAt?: number }>(first: T[], second: T[], deletions: Record<string, number>): T[] {
  const items = new Map<string, T>()
  for (const item of [...first, ...second]) {
    const current = items.get(item.id)
    if (!current || itemVersion(item) > itemVersion(current)) items.set(item.id, item)
  }
  return [...items.values()]
    .filter((item) => (deletions[item.id] ?? 0) < itemVersion(item))
    .sort((a, b) => b.createdAt - a.createdAt)
}

function mergeSnapshots(first: CloudSnapshot, second: CloudSnapshot): CloudSnapshot {
  const deletions = mergeDeletionLogs(first.deletions, second.deletions)
  return {
    transactions: mergeCollection(first.transactions, second.transactions, deletions.transactions),
    reserveMovements: mergeCollection(first.reserveMovements, second.reserveMovements, deletions.reserveMovements),
    loans: mergeCollection(first.loans, second.loans, deletions.loans),
    deletions,
    updatedAt: Math.max(first.updatedAt, second.updatedAt, Date.now()),
    futureSavings: (second.futureSavings?.updatedAt ?? -1) > (first.futureSavings?.updatedAt ?? -1) ? second.futureSavings : first.futureSavings,
  }
}

function loadDeletions(): DeletionLog {
  try {
    const saved = localStorage.getItem(DELETIONS_KEY)
    return saved ? mergeDeletionLogs(emptyDeletions(), JSON.parse(saved) as DeletionLog) : emptyDeletions()
  } catch {
    return emptyDeletions()
  }
}

function localSnapshot(): CloudSnapshot {
  return {
    transactions: loadTransactions(),
    reserveMovements: loadReserveMovements(),
    loans: loadLoans(),
    deletions: loadDeletions(),
    updatedAt: Date.now(),
    futureSavings: loadFutureSavingsPlan() ?? undefined,
  }
}

function saveSnapshotLocally(snapshot: CloudSnapshot): void {
  saveTransactions(snapshot.transactions)
  saveReserveMovements(snapshot.reserveMovements)
  saveLoans(snapshot.loans ?? [])
  localStorage.setItem(DELETIONS_KEY, JSON.stringify(snapshot.deletions ?? emptyDeletions()))
  if (snapshot.futureSavings) localStorage.setItem(FUTURE_SAVINGS_KEY, JSON.stringify(snapshot.futureSavings))
}

function sessionCredentials(): { token: string, encryptionKey: string } | null {
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY)
  const encryptionKey = sessionStorage.getItem(SESSION_ENCRYPTION_KEY)
  return token && encryptionKey ? { token, encryptionKey } : null
}

async function saveEncryptedSnapshot(snapshot: CloudSnapshot, token: string, encryptionKey: string, expectedRevision: number): Promise<void> {
  const payload = await encryptSnapshot(snapshot, encryptionKey)
  await callSync({ action: 'save', payload, expectedRevision }, token)
}

async function synchronizeSnapshot(seed: CloudSnapshot, token: string, encryptionKey: string): Promise<CloudSnapshot> {
  let snapshot = normalizeSnapshot(seed)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const cloud = await callSync({ action: 'load' }, token)
    if (cloud.found && cloud.payload) {
      snapshot = mergeSnapshots(snapshot, normalizeSnapshot(await decryptSnapshot(cloud.payload, encryptionKey)))
    }
    try {
      await saveEncryptedSnapshot(snapshot, token, encryptionKey, cloud.revision ?? 0)
      saveSnapshotLocally(snapshot)
      return snapshot
    } catch (error) {
      if (!(error instanceof SyncConflictError)) throw error
    }
  }
  throw new SyncUnavailableError('Koru detectó demasiados cambios simultáneos. Vuelve a intentarlo.')
}

function recordMissingIds<T extends { id: string }>(previous: T[], next: T[], deletions: Record<string, number>, deletedAt: number) {
  const nextIds = new Set(next.map((item) => item.id))
  for (const item of previous) {
    if (!nextIds.has(item.id)) deletions[item.id] = Math.max(deletions[item.id] ?? 0, deletedAt)
  }
}

export async function authenticateAndSync(password: string): Promise<CloudSnapshot> {
  const encryptionKey = await deriveEncryptionKey(password)
  let login: SyncResponse
  try {
    login = await callSync({ action: 'login', password })
  } catch (error) {
    if (error instanceof SyncUnavailableError && await hashPassword(password) === LOCAL_PASSWORD_HASH) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, OFFLINE_SESSION)
      sessionStorage.setItem(SESSION_ENCRYPTION_KEY, encryptionKey)
      return localSnapshot()
    }
    throw error
  }
  if (!login.token) throw new SyncUnavailableError('Koru no devolvió una sesión válida.')

  sessionStorage.setItem(SESSION_TOKEN_KEY, login.token)
  sessionStorage.setItem(SESSION_ENCRYPTION_KEY, encryptionKey)

  try {
    const snapshot = await synchronizeSnapshot(localSnapshot(), login.token, encryptionKey)
    return snapshot
  } catch (error) {
    if (error instanceof SyncUnavailableError && await hashPassword(password) === LOCAL_PASSWORD_HASH) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, OFFLINE_SESSION)
      sessionStorage.setItem(SESSION_ENCRYPTION_KEY, encryptionKey)
      return localSnapshot()
    }
    closeSession()
    throw error
  }
}

export async function syncFromCloud(): Promise<CloudSnapshot | null> {
  const credentials = sessionCredentials()
  if (!credentials) return null
  if (credentials.token === OFFLINE_SESSION) throw new SyncUnavailableError('Sincronización pendiente.')
  return synchronizeSnapshot(localSnapshot(), credentials.token, credentials.encryptionKey)
}

export function syncToCloud(transactions: Transaction[], reserveMovements: ReserveMovement[], loans: Loan[], futureSavings = loadFutureSavingsPlan()): Promise<void> {
  const previous = localSnapshot()
  const now = Date.now()
  const deletions = mergeDeletionLogs(previous.deletions, emptyDeletions())
  recordMissingIds(previous.transactions, transactions, deletions.transactions, now)
  recordMissingIds(previous.reserveMovements, reserveMovements, deletions.reserveMovements, now)
  recordMissingIds(previous.loans, loans, deletions.loans, now)
  const snapshot: CloudSnapshot = { transactions: compactTransactions(transactions), reserveMovements, loans, deletions, updatedAt: now, futureSavings: futureSavings ?? undefined }
  saveSnapshotLocally(snapshot)

  const credentials = sessionCredentials()
  if (!credentials) return Promise.reject(new SyncUnavailableError('La sesión ha caducado.'))
  if (credentials.token === OFFLINE_SESSION) return Promise.reject(new SyncUnavailableError('Sincronización pendiente.'))

  syncQueue = syncQueue
    .catch(() => undefined)
    .then(() => synchronizeSnapshot(snapshot, credentials.token, credentials.encryptionKey).then(() => undefined))
  return syncQueue
}

export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist()
  } catch {
    // The local cache still works when persistence is declined.
  }
}

export function isSessionOpen(): boolean {
  return sessionCredentials() !== null
}

export function getCloudSessionToken(): string | null {
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY)
  return token && token !== OFFLINE_SESSION ? token : null
}

export function closeSession(): void {
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_ENCRYPTION_KEY)
}

export function loadTransactions(): Transaction[] {
  try {
    const saved = localStorage.getItem(TRANSACTIONS_KEY)
    if (!saved) return []
    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? (parsed as Transaction[]) : []
  } catch {
    return []
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(compactTransactions(transactions)))
}

function compactTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.map((transaction) => transaction.purchaseBatch ? {
    ...transaction,
    purchaseBatch: buildPurchaseBatch(getPurchaseBatchSources(transaction.purchaseBatch)) ?? undefined,
  } : transaction)
}

export function loadFutureSavingsPlan(): FutureSavingsPlan | null {
  try {
    const saved = JSON.parse(localStorage.getItem(FUTURE_SAVINGS_KEY) ?? 'null')
    return validFutureSavingsPlan(saved) ? saved : null
  } catch {
    return null
  }
}

export function loadReserveMovements(): ReserveMovement[] {
  try {
    const saved = localStorage.getItem(RESERVES_KEY)
    if (!saved) return []
    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? (parsed as ReserveMovement[]) : []
  } catch {
    return []
  }
}

export function saveReserveMovements(movements: ReserveMovement[]): void {
  localStorage.setItem(RESERVES_KEY, JSON.stringify(movements))
}

export function loadLoans(): Loan[] {
  try {
    const saved = localStorage.getItem(LOANS_KEY)
    if (!saved) return []
    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? (parsed as Loan[]) : []
  } catch {
    return []
  }
}

export function saveLoans(loans: Loan[]): void {
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans))
}
