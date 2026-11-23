import { useCallback, useEffect, useRef, useState } from 'react'
import AuthScreen from './AuthScreen'
import type { BackupData } from './BackupPanel'
import Dashboard from './Dashboard'
import { normalizeCryptoAsset } from './finance'
import { closeSession, isSessionOpen, loadFutureSavingsPlan, loadLoans, loadReserveMovements, loadTransactionDraftRecord, loadTransactions, saveTransactionDraftRecord, syncFromCloud, syncToCloud, type CloudSnapshot } from './storage'
import type { AppFeedback, FutureSavingsPlan, Loan, ReserveMovement, SyncStatus, ThemePreference, Transaction, TransactionFormDraftData, TransactionFormDraftRecord } from './types'

const THEME_KEY = 'koru.theme.v1'

function initialTheme(): ThemePreference {
  const saved = localStorage.getItem(THEME_KEY)
  const theme: ThemePreference = saved === 'light' || saved === 'dark' ? saved : 'system'
  applyTheme(theme)
  return theme
}

function applyTheme(theme: ThemePreference) {
  const resolved = theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme === 'system' ? 'light' : theme
  document.documentElement.dataset.theme = resolved
  document.documentElement.dataset.themePreference = theme
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(isSessionOpen)
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions)
  const [reserveMovements, setReserveMovements] = useState<ReserveMovement[]>(loadReserveMovements)
  const [loans, setLoans] = useState<Loan[]>(loadLoans)
  const [futureSavings, setFutureSavings] = useState<FutureSavingsPlan | null>(loadFutureSavingsPlan)
  const [transactionDraft, setTransactionDraft] = useState<TransactionFormDraftRecord | null>(loadTransactionDraftRecord)
  const [draftSaveSequence, setDraftSaveSequence] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [feedback, setFeedback] = useState<AppFeedback | null>(null)
  const feedbackSequence = useRef(0)
  const [theme, setTheme] = useState<ThemePreference>(initialTheme)

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      setFeedback((current) => current?.id === feedback.id ? null : current)
    }, 3600)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    if (theme !== 'system') return
    const preference = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => applyTheme('system')
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [theme])

  function changeTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme)
    localStorage.setItem(THEME_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  useEffect(() => {
    if (!authenticated) return
    let active = true
    syncFromCloud()
      .then((snapshot) => {
        if (!active || !snapshot) return
        setTransactions(snapshot.transactions)
        setReserveMovements(snapshot.reserveMovements)
        setLoans(snapshot.loans ?? [])
        setFutureSavings(snapshot.futureSavings ?? loadFutureSavingsPlan())
        setTransactionDraft(snapshot.transactionDraft ?? loadTransactionDraftRecord())
        setSyncStatus('synced')
      })
      .catch(() => {
        if (!active) return
        setSyncStatus('offline')
        setFeedback({ id: ++feedbackSequence.current, message: 'Sin conexión. Tus datos siguen guardados en este dispositivo.', tone: 'warning' })
      })
    return () => { active = false }
  }, [authenticated])

  useEffect(() => {
    if (!authenticated || draftSaveSequence === 0 || !transactionDraft) return
    const timer = window.setTimeout(() => {
      Promise.resolve()
        .then(() => syncToCloud(transactions, reserveMovements, loans, futureSavings, transactionDraft))
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('offline'))
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [authenticated, draftSaveSequence, futureSavings, loans, reserveMovements, transactionDraft, transactions])

  const saveTransactionDraft = useCallback((data: TransactionFormDraftData | null) => {
    const record: TransactionFormDraftRecord = data
      ? { data, updatedAt: Date.now() }
      : { cleared: true, updatedAt: Date.now() }
    try {
      saveTransactionDraftRecord(record)
      setTransactionDraft(record)
      setDraftSaveSequence((current) => current + 1)
    } catch {
      setSyncStatus('storage-error')
      setFeedback({ id: ++feedbackSequence.current, message: 'No pude guardar el borrador en este dispositivo.', tone: 'warning' })
    }
  }, [])

  function sync(nextTransactions: Transaction[], nextReserves: ReserveMovement[], nextLoans: Loan[], successMessage: string, nextPlan = futureSavings) {
    const feedbackId = ++feedbackSequence.current
    let pending: Promise<void>
    try {
      pending = syncToCloud(nextTransactions, nextReserves, nextLoans, nextPlan)
    } catch {
      setSyncStatus('storage-error')
      setFeedback({ id: feedbackId, message: 'No se pudo guardar. Libera espacio o elimina fotos y vuelve a intentarlo.', tone: 'warning' })
      return false
    }
    setSyncStatus('syncing')
    setFeedback({ id: feedbackId, message: 'Guardado en este dispositivo · sincronizando…', tone: 'saving' })
    pending
      .then(() => {
        setSyncStatus('synced')
        setFeedback((current) => current && current.id > feedbackId ? current : { id: feedbackId, message: successMessage, tone: 'success' })
      })
      .catch(() => {
        setSyncStatus('offline')
        setFeedback((current) => current && current.id > feedbackId ? current : { id: feedbackId, message: 'Guardado aquí. Se sincronizará cuando vuelva la conexión.', tone: 'warning' })
      })
    return true
  }

  function updateTransactions(next: Transaction[], successMessage: string) {
    if (!sync(next, reserveMovements, loans, successMessage)) return false
    setTransactions(next)
    return true
  }

  function addTransaction(transaction: Transaction) {
    return updateTransactions([transaction, ...transactions], transaction.type === 'income' ? 'Ingreso guardado y sincronizado' : 'Gasto guardado y sincronizado')
  }

  function updateTransaction(transaction: Transaction) {
    return updateTransactions(transactions.map((current) => current.id === transaction.id ? transaction : current), 'Movimiento actualizado y sincronizado')
  }

  function deleteTransaction(id: string) {
    updateTransactions(transactions.filter((transaction) => transaction.id !== id), 'Movimiento eliminado y cambio sincronizado')
  }

  function addReserveMovement(movement: ReserveMovement) {
    const nextReserves = [movement, ...reserveMovements]
    const nextTransactions = movement.action === 'transfer' && movement.fee
      ? [{
          id: `crypto-fee-${movement.id}`,
          type: 'expense' as const,
          amount: movement.fee,
          category: 'Comisiones cripto',
          date: movement.date,
          description: `${normalizeCryptoAsset(movement.cryptoSourceAsset)} → ${normalizeCryptoAsset(movement.cryptoAsset)}`,
          createdAt: movement.createdAt,
          updatedAt: movement.updatedAt ?? movement.createdAt,
          reserveMovementId: movement.id,
        }, ...transactions]
      : transactions
    setTransactions(nextTransactions)
    setReserveMovements(nextReserves)
    sync(nextTransactions, nextReserves, loans, movement.action === 'transfer' ? 'Cambio de criptomonedas guardado' : 'Reserva actualizada y sincronizada')
  }

  function deleteReserveMovement(id: string) {
    const nextReserves = reserveMovements.filter((movement) => movement.id !== id)
    const nextTransactions = transactions.filter((transaction) => transaction.reserveMovementId !== id)
    setTransactions(nextTransactions)
    setReserveMovements(nextReserves)
    sync(nextTransactions, nextReserves, loans, 'Movimiento de reserva eliminado')
  }

  function updateReserveMovement(movement: ReserveMovement) {
    const nextReserves = reserveMovements.map((current) => current.id === movement.id ? movement : current)
    const withoutLinkedFee = transactions.filter((transaction) => transaction.reserveMovementId !== movement.id)
    const previousFee = transactions.find((transaction) => transaction.reserveMovementId === movement.id)
    const nextTransactions = movement.action === 'transfer' && movement.fee
      ? [{
          id: previousFee?.id ?? `crypto-fee-${movement.id}`,
          type: 'expense' as const,
          amount: movement.fee,
          category: 'Comisiones cripto',
          date: movement.date,
          description: `${normalizeCryptoAsset(movement.cryptoSourceAsset)} → ${normalizeCryptoAsset(movement.cryptoAsset)}`,
          createdAt: previousFee?.createdAt ?? movement.createdAt,
          updatedAt: Date.now(),
          reserveMovementId: movement.id,
        }, ...withoutLinkedFee]
      : withoutLinkedFee
    setTransactions(nextTransactions)
    setReserveMovements(nextReserves)
    sync(nextTransactions, nextReserves, loans, 'Movimiento de reserva actualizado')
  }


  function saveLoan(loan: Loan) {
    const exists = loans.some((current) => current.id === loan.id)
    const nextLoans = exists
      ? loans.map((current) => current.id === loan.id ? loan : current)
      : [loan, ...loans]
    setLoans(nextLoans)
    sync(transactions, reserveMovements, nextLoans, exists ? 'Préstamo actualizado y sincronizado' : 'Préstamo guardado y sincronizado')
  }

  function deleteLoan(id: string) {
    const nextLoans = loans.filter((loan) => loan.id !== id)
    setLoans(nextLoans)
    sync(transactions, reserveMovements, nextLoans, 'Préstamo eliminado y cambio sincronizado')
  }

  function importBackup(data: BackupData) {
    function combine<T extends { id: string, createdAt: number, updatedAt?: number }>(current: T[], incoming: T[]): T[] {
      const merged = new Map(current.map((item) => [item.id, item]))
      for (const item of incoming) {
        const existing = merged.get(item.id)
        if (!existing || (item.updatedAt ?? item.createdAt) > (existing.updatedAt ?? existing.createdAt)) merged.set(item.id, item)
      }
      return [...merged.values()].sort((a, b) => b.createdAt - a.createdAt)
    }
    const nextTransactions = combine(transactions, data.transactions)
    const nextReserves = combine(reserveMovements, data.reserveMovements)
    const nextLoans = combine(loans, data.loans)
    setTransactions(nextTransactions)
    setReserveMovements(nextReserves)
    setLoans(nextLoans)
    sync(nextTransactions, nextReserves, nextLoans, 'Copia importada y sincronizada')
  }

  function logout() {
    closeSession()
    setAuthenticated(false)
  }

  function saveFutureSavings(plan: FutureSavingsPlan) {
    if (!sync(transactions, reserveMovements, loans, 'Plan de ahorro guardado y sincronizado', plan)) return false
    setFutureSavings(plan)
    return true
  }

  function authenticatedWith(snapshot: CloudSnapshot) {
    setTransactions(snapshot.transactions)
    setReserveMovements(snapshot.reserveMovements)
    setLoans(snapshot.loans ?? [])
    setFutureSavings(snapshot.futureSavings ?? loadFutureSavingsPlan())
    setTransactionDraft(snapshot.transactionDraft ?? loadTransactionDraftRecord())
    setSyncStatus('synced')
    setAuthenticated(true)
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={authenticatedWith} />
  }

  return (
    <Dashboard
      transactions={transactions}
      onAdd={addTransaction}
      transactionDraft={transactionDraft?.cleared ? null : transactionDraft?.data ?? null}
      onTransactionDraftChange={saveTransactionDraft}
      onDelete={deleteTransaction}
      onUpdate={updateTransaction}
      reserveMovements={reserveMovements}
      syncStatus={syncStatus}
      feedback={feedback}
      onAddReserveMovement={addReserveMovement}
      onDeleteReserveMovement={deleteReserveMovement}
      onUpdateReserveMovement={updateReserveMovement}
      loans={loans}
      futureSavings={futureSavings}
      onSaveFutureSavings={saveFutureSavings}
      onSaveLoan={saveLoan}
      onDeleteLoan={deleteLoan}
      onImportBackup={importBackup}
      onImportCsv={(incoming) => updateTransactions([...incoming, ...transactions], `${incoming.length} movimientos del CSV guardados y sincronizados`)}
      theme={theme}
      onThemeChange={changeTheme}
      onLogout={logout}
    />
  )
}
