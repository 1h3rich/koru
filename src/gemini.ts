import { getCloudSessionToken } from './storage'
import type { ReceiptDetails } from './types'

interface GeminiAmountsResponse {
  amounts?: number[]
  receipt?: Omit<ReceiptDetails, 'imageDataUrl' | 'items'> & { items: Array<{ name: string, price: number }> }
  error?: string
}

export class GeminiUnavailableError extends Error {}

async function readWithGemini(imageDataUrl: string, mode: 'expenses' | 'receipt'): Promise<GeminiAmountsResponse> {
  const token = getCloudSessionToken()
  if (!token) throw new GeminiUnavailableError('Gemini necesita conexión con Koru.')

  let response: Response
  try {
    response = await fetch('/api/gemini-amounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageDataUrl, mode }),
    })
  } catch {
    throw new GeminiUnavailableError('Gemini no está disponible ahora mismo.')
  }

  const result = await response.json().catch(() => ({})) as GeminiAmountsResponse
  if (!response.ok) throw new GeminiUnavailableError(result.error || 'Gemini no está disponible ahora mismo.')
  return result
}

export async function readPurchaseAmountsWithGemini(imageDataUrl: string): Promise<number[]> {
  const result = await readWithGemini(imageDataUrl, 'expenses')
  return Array.isArray(result.amounts)
    ? result.amounts.filter((amount) => Number.isFinite(amount) && amount > 0)
    : []
}

export async function readReceiptWithGemini(imageDataUrl: string): Promise<ReceiptDetails> {
  const { receipt } = await readWithGemini(imageDataUrl, 'receipt')
  if (!receipt || typeof receipt.merchant !== 'string' || !Number.isFinite(receipt.total) || !Array.isArray(receipt.items)) {
    throw new GeminiUnavailableError('Gemini no devolvió un ticket válido.')
  }
  return { ...receipt, items: receipt.items.map((item) => ({ ...item, id: crypto.randomUUID() })) }
}
