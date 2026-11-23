import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const PROFILE_KEY = 'primary'
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 12
const MAX_PAYLOAD_BYTES = 4_500_000

function json(response, status, body) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(status).json(body)
}

function isAllowedOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return true
  if (origin === 'https://koru.onl') return true
  if (process.env.VERCEL_ENV !== 'production' && origin.endsWith('.vercel.app')) return true
  return origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:4173'
}

function safeEqual(first, second) {
  const firstBuffer = Buffer.from(first)
  const secondBuffer = Buffer.from(second)
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer)
}

function signToken() {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
    version: 1,
  })).toString('base64url')
  const signature = createHmac('sha256', process.env.KORU_SYNC_SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function tokenIsValid(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token || !process.env.KORU_SYNC_SECRET) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const expected = createHmac('sha256', process.env.KORU_SYNC_SECRET).update(payload).digest('base64url')
  if (!safeEqual(signature, expected)) return false

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return Number(decoded.exp) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

function getDatabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Koru storage is not configured')
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function parseBody(request) {
  if (typeof request.body === 'string') return JSON.parse(request.body)
  return request.body ?? {}
}

export default async function handler(request, response) {
  if (!isAllowedOrigin(request)) return json(response, 403, { error: 'Origen no permitido.' })

  try {
    const client = getDatabaseClient()

    if (request.method === 'GET') {
      const { error } = await client.from('koru_finance_sync').select('revision').eq('profile_key', PROFILE_KEY).limit(1)
      if (error) throw error
      return json(response, 200, { ok: true, database: 'ready' })
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST')
      return json(response, 405, { error: 'Método no permitido.' })
    }

    const body = parseBody(request)
    if (body.action === 'login') {
      const expectedHash = process.env.KORU_PASSWORD_HASH
      const candidateHash = createHash('sha256').update(String(body.password ?? '')).digest('hex')
      if (!expectedHash || !safeEqual(candidateHash, expectedHash)) {
        return json(response, 401, { error: 'Contraseña incorrecta.' })
      }
      return json(response, 200, { token: signToken() })
    }

    if (!tokenIsValid(request)) return json(response, 401, { error: 'Sesión no válida.' })
    if (body.action === 'load') {
      const { data, error } = await client
        .from('koru_finance_sync')
        .select('payload, revision')
        .eq('profile_key', PROFILE_KEY)
        .maybeSingle()
      if (error) throw error
      if (!data) return json(response, 200, { found: false, revision: 0 })
      return json(response, 200, { found: true, payload: data.payload, revision: data.revision })
    }

    if (body.action === 'save') {
      const payload = body.payload
      if (!payload || payload.version !== 1 || typeof payload.iv !== 'string' || typeof payload.data !== 'string') {
        return json(response, 400, { error: 'Datos cifrados no válidos.' })
      }

      const encoded = JSON.stringify(payload)
      if (Buffer.byteLength(encoded) > MAX_PAYLOAD_BYTES) {
        return json(response, 413, { error: 'Los datos superan el tamaño permitido.' })
      }

      const expectedRevision = Number(body.expectedRevision)
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        return json(response, 400, { error: 'Versión de sincronización no válida.' })
      }

      if (expectedRevision === 0) {
        const { error } = await client.from('koru_finance_sync').insert({ profile_key: PROFILE_KEY, payload, revision: 1 })
        if (error?.code === '23505') return json(response, 409, { error: 'Hay cambios nuevos en otro dispositivo.' })
        if (error) throw error
        return json(response, 200, { saved: true, revision: 1 })
      }

      const { data, error } = await client
        .from('koru_finance_sync')
        .update({ payload, revision: expectedRevision + 1, updated_at: new Date().toISOString() })
        .eq('profile_key', PROFILE_KEY)
        .eq('revision', expectedRevision)
        .select('revision')
        .maybeSingle()
      if (error) throw error
      if (!data) return json(response, 409, { error: 'Hay cambios nuevos en otro dispositivo.' })
      return json(response, 200, { saved: true, revision: data.revision })
    }

    return json(response, 400, { error: 'Acción no válida.' })
  } catch (error) {
    console.error('Koru sync error:', error)
    return json(response, 500, { error: 'No se pudo sincronizar ahora mismo.' })
  }
}
