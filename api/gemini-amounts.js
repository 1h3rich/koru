import { createHmac, timingSafeEqual } from 'node:crypto'
import { normalizeReceipt, receiptPrompt, receiptSchema } from '../server/receipt-reading.js'

const GEMINI_MODELS = [
  { name: 'gemini-3.5-flash-lite', thinkingLevel: 'MINIMAL' },
  { name: 'gemini-3.6-flash', thinkingLevel: 'MINIMAL' },
  { name: 'gemini-3.8-flash', thinkingLevel: 'LOW' },
  { name: 'gemini-3-flash-preview', thinkingLevel: 'MINIMAL' },
]
const MAX_IMAGE_BYTES = 500_000

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

function parseBody(request) {
  if (typeof request.body === 'string') return JSON.parse(request.body)
  return request.body ?? {}
}

function parseImage(dataUrl) {
  const match = String(dataUrl ?? '').match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i)
  if (!match) return null
  const size = Buffer.byteLength(match[2], 'base64')
  if (size <= 0 || size > MAX_IMAGE_BYTES) return null
  return { mimeType: match[1], data: match[2] }
}

function parsePrintedAmount(value) {
  const normalized = String(value ?? '').replace('−', '-').trim()
  // A visible minus is required. Never turn a credit or unsigned reading into
  // an expense even when the model reports its absolute value correctly.
  const match = normalized.match(/^-\s*(\d[\d.\s]*?)[,.](\d{2})\s*(?:€|eur)\s*$/i)
  if (!match) return null
  const integerPart = match[1].replace(/[.\s]/g, '')
  const amount = Number(`${integerPart}.${match[2]}`)
  return Number.isFinite(amount) && amount > 0 && amount < 1_000_000_000
    ? Number(amount.toFixed(2))
    : null
}

function normalizeReadings(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((reading) => reading?.visuallyPrimary === true && Number(reading.confidence) >= 0.9)
    .map((reading) => {
      const printedAmount = parsePrintedAmount(reading.printed)
      const reportedAmount = Number(reading.amount)
      const y = Number(reading.relativeY)
      if (printedAmount === null || !Number.isFinite(reportedAmount) || Math.abs(printedAmount - reportedAmount) > 0.011) return null
      if (!Number.isFinite(y) || y < 0 || y > 1) return null
      return { amount: printedAmount, y }
    })
    .filter(Boolean)
    .sort((first, second) => first.y - second.y)
    .map((reading) => reading.amount)
}

async function geminiFailure(response) {
  const payload = await response.json().catch(() => ({}))
  const providerStatus = payload?.error?.status
  const providerMessage = typeof payload?.error?.message === 'string' ? payload.error.message.slice(0, 500) : 'Sin detalle'
  console.error('[DEBUG-gemini-upstream]', response.status, providerStatus ?? 'UNKNOWN', providerMessage)
  if (response.status === 401 || response.status === 403) return 'Google ha rechazado la clave de Gemini.'
  if (response.status === 404 || providerStatus === 'NOT_FOUND') return 'El modelo de Gemini no está disponible para esta cuenta.'
  if (response.status === 429 || providerStatus === 'RESOURCE_EXHAUSTED') return 'Se ha alcanzado el límite gratuito de Gemini. Inténtalo más tarde.'
  if (response.status >= 500) return 'Gemini tiene una incidencia temporal. Inténtalo de nuevo.'
  return 'Gemini rechazó la lectura de la imagen.'
}

export default async function handler(request, response) {
  if (!isAllowedOrigin(request)) return json(response, 403, { error: 'Origen no permitido.' })
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return json(response, 405, { error: 'Método no permitido.' })
  }
  if (!tokenIsValid(request)) return json(response, 401, { error: 'Sesión no válida.' })
  if (!process.env.GEMINI_API_KEY) return json(response, 503, { error: 'Gemini no está configurado.' })

  try {
    const body = parseBody(request)
    const mode = body.mode ?? 'expenses'
    if (mode !== 'expenses' && mode !== 'receipt') return json(response, 400, { error: 'Tipo de lectura no válido.' })
    const image = parseImage(body.imageDataUrl)
    if (!image) return json(response, 400, { error: 'Imagen no válida o demasiado grande.' })

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'Eres un verificador visual de importes extremadamente estricto. Omite cualquier dato dudoso. Nunca converses, expliques, calcules ni inventes.' }],
        },
        contents: [{
          role: 'user',
          parts: [
            {
              text: mode === 'receipt' ? receiptPrompt : [
                'Lee esta captura de movimientos bancarios.',
                'Distingue gastos negativos de ingresos positivos. Devuelve SOLO movimientos con signo negativo visible (- o −), en orden de arriba hacia abajo.',
                'Excluye ingresos, abonos, devoluciones y cualquier importe positivo con +. Excluye también importes sin signo o cuyo signo no se vea con claridad; nunca supongas que son gastos.',
                'Si hay cuatro movimientos y tres son negativos y uno positivo, devuelve exactamente los tres negativos. Si no hay negativos claros, devuelve readings vacío.',
                'Incluye únicamente el importe PRINCIPAL visualmente destacado de cada movimiento.',
                'Ignora saldos, fechas, horas, números de tarjeta, límites, tipos de cambio y equivalencias secundarias pequeñas o atenuadas.',
                'Para cada importe copia literalmente el texto impreso, incluyendo signo, decimales y símbolo €. Indica su posición vertical aproximada entre 0 y 1.',
                'Marca visuallyPrimary=true solamente si es el importe principal de una fila y se ve con claridad. Exige confianza mínima de 0.90; si dudas, omítelo.',
                'printed debe conservar el signo negativo visible. amount es la magnitud positiva de ese gasto negativo, con dos decimales, porque Koru ya lo registra como gasto. No cambies el signo de un ingreso para incluirlo, ni calcules ni sumes.',
              ].join(' '),
            },
            { inlineData: { mimeType: image.mimeType, data: image.data } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: mode === 'receipt' ? 8192 : 2048,
          thinkingConfig: { thinkingLevel: GEMINI_MODELS[0].thinkingLevel },
          responseMimeType: 'application/json',
          responseJsonSchema: mode === 'receipt' ? receiptSchema : {
            type: 'object',
            properties: {
              readings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    printed: { type: 'string', description: 'Texto exacto de un gasto con signo negativo visible, decimales y €.' },
                    amount: { type: 'number', description: 'Magnitud positiva del gasto negativo de printed. Nunca un ingreso.' },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    visuallyPrimary: { type: 'boolean' },
                    relativeY: { type: 'number', minimum: 0, maximum: 1 },
                  },
                  required: ['printed', 'amount', 'confidence', 'visuallyPrimary', 'relativeY'],
                  additionalProperties: false,
                },
                description: 'Solo gastos con signo negativo visible. Excluye positivos, ingresos e importes sin signo.',
              },
            },
            required: ['readings'],
            additionalProperties: false,
          },
        },
      }),
    }

    let geminiResponse
    for (const [index, model] of GEMINI_MODELS.entries()) {
      try {
        const modelRequestOptions = {
          ...requestOptions,
          body: JSON.stringify({
            ...JSON.parse(requestOptions.body),
            generationConfig: {
              ...JSON.parse(requestOptions.body).generationConfig,
              thinkingConfig: { thinkingLevel: model.thinkingLevel },
            },
          }),
          signal: AbortSignal.timeout(12_000),
        }
        geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent`, modelRequestOptions)
      } catch (error) {
        if (index < GEMINI_MODELS.length - 1) continue
        throw error
      }
      if (geminiResponse.ok || geminiResponse.status !== 503 || index === GEMINI_MODELS.length - 1) break
    }

    if (!geminiResponse.ok) return json(response, 502, { error: await geminiFailure(geminiResponse) })
    const result = await geminiResponse.json()
    const candidate = result?.candidates?.[0]
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') return json(response, 502, { error: 'La lectura quedó incompleta. Divide la imagen y vuelve a intentarlo.' })
    const text = candidate?.content?.parts?.find((part) => typeof part.text === 'string' && !part.thought)?.text
    if (!text) return json(response, 502, { error: 'Gemini no devolvió importes.' })
    const parsed = JSON.parse(text)
    if (mode === 'receipt') return json(response, 200, { receipt: normalizeReceipt(parsed) })
    const amounts = normalizeReadings(parsed.readings)
    return json(response, 200, { amounts })
  } catch {
    return json(response, 502, { error: 'Gemini no está disponible ahora mismo.' })
  }
}
