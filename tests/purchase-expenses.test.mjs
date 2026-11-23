import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { afterEach, mock, test } from 'node:test'
import handler from '../api/gemini-amounts.js'
import { parseLargePurchaseAmounts, parsePurchaseAmounts } from '../src/receipt.ts'
import { buildPurchaseBatch, getPurchaseBatchSources, removePurchaseBatchImage } from '../src/purchaseBatch.ts'
import { createTransactionFormDraft } from '../src/transactionDraft.ts'
import { parseTransactionsCsv } from '../src/csvImport.ts'

// This process uses only a fake session/key and a controlled Gemini response.
process.env.KORU_SYNC_SECRET = 'owned-negative-expenses-test'
process.env.GEMINI_API_KEY = 'owned-not-a-provider-key'
afterEach(() => mock.restoreAll())

async function readWithGemini(readings, options = {}) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url')
  const signature = createHmac('sha256', process.env.KORU_SYNC_SECRET).update(payload).digest('base64url')
  let prompt
  let requestedUrl
  const requestedUrls = []
  mock.method(globalThis, 'fetch', async (url, requestOptions) => {
    requestedUrl = String(url)
    requestedUrls.push(requestedUrl)
    prompt = JSON.parse(requestOptions.body)
    if (requestedUrls.length <= (options.unavailableCount ?? (options.firstUnavailable ? 1 : 0))) {
      return { ok: false, status: 503, json: async () => ({ error: { status: 'UNAVAILABLE', message: 'Temporary demand spike' } }) }
    }
    return { ok: true, json: async () => ({ candidates: [{ finishReason: options.finishReason ?? 'STOP', content: { parts: [{ text: JSON.stringify(options.receipt ?? { readings }) }] } }] }) }
  })
  const response = { statusCode: null, body: null, setHeader() {}, status(code) { this.statusCode = code; return this }, json(value) { this.body = value } }
  await handler({ method: 'POST', headers: { origin: 'https://koru.onl', authorization: `Bearer ${payload}.${signature}` }, body: { imageDataUrl: 'data:image/png;base64,YQ==', mode: options.mode ?? 'expenses' } }, response)
  assert.equal(response.statusCode, options.status ?? 200)
  return { ...response.body, prompt, requestedUrl, requestedUrls }
}

function reading(printed, amount, relativeY = 0.5, changes = {}) {
  return { printed, amount, relativeY, confidence: 0.99, visuallyPrimary: true, ...changes }
}

test('Gemini: four movements with three expenses and one income only add the three expenses', async () => {
  const { amounts } = await readWithGemini([
    reading('-12,50 €', 12.5, 0.1), reading('+500,00 €', 500, 0.2),
    reading('−8,00 €', 8, 0.3), reading('-25.00 EUR', 25, 0.4),
  ])
  assert.deepEqual(amounts, [12.5, 8, 25])
  assert.equal(amounts.reduce((sum, value) => sum + value, 0), 45.5)
})

test('Gemini: only incomes or unsigned amounts produce an empty expense list', async () => {
  const { amounts } = await readWithGemini([reading('+500,00 €', 500), reading('80,00 €', 80)])
  assert.deepEqual(amounts, [])
})

test('Gemini: negative sign is mandatory even when the model returns a positive expense magnitude', async () => {
  const { amounts } = await readWithGemini([
    reading('- 1.234,56 €', 1234.56), reading('-4,00 €', 40),
    reading('-8,00 €', 8, 0.3, { confidence: 0.5 }),
    reading('-9,00 €', 9, 0.4, { visuallyPrimary: false }), reading('-0,00 €', 0),
  ])
  assert.deepEqual(amounts, [1234.56])
})

test('Gemini prompt explicitly excludes positive/unsigned movements and requests visible negative signs', async () => {
  const { prompt } = await readWithGemini([])
  const text = prompt.contents[0].parts[0].text
  assert.match(text, /[Nn]egativ/)
  assert.match(text, /[Ii]ngresos/)
  assert.match(text, /[Ss]in signo/)
})

test('Gemini uses the current free-tier Flash model for new projects', async () => {
  const { requestedUrl } = await readWithGemini([])
  assert.match(requestedUrl, /models\/gemini-3\.5-flash-lite:generateContent/)
})

test('Gemini falls back to another free Flash model during a demand spike', async () => {
  const { amounts, requestedUrls } = await readWithGemini([reading('-7,50 €', 7.5)], { firstUnavailable: true })
  assert.deepEqual(amounts, [7.5])
  assert.match(requestedUrls[0], /gemini-3\.5-flash-lite:generateContent/)
  assert.match(requestedUrls[1], /gemini-3\.6-flash/)
})

test('Gemini can reach the latest stable Flash model when the first two models are saturated', async () => {
  const { amounts, requestedUrls } = await readWithGemini([reading('-7,50 €', 7.5)], { unavailableCount: 2 })
  assert.deepEqual(amounts, [7.5])
  assert.equal(requestedUrls.length, 6)
  assert.match(requestedUrls[2], /gemini-3\.8-flash/)
  assert.match(requestedUrls[3], /gemini-3-flash-preview/)
  assert.match(requestedUrls[4], /gemini-2\.5-flash-lite/)
  assert.match(requestedUrls[5], /gemini-2\.5-flash:generateContent/)
})

test('Text fallback: three negative expenses and one positive income', () => {
  assert.deepEqual(parsePurchaseAmounts('Compra -12,50 €\nIngreso +500,00 €\nCompra −8,00 €\nCompra -25.00 EUR'), [12.5, 8, 25])
  assert.deepEqual(parsePurchaseAmounts('Ingreso +500,00 €\nImporte 80,00 €'), [])
})

function line(words, y) {
  return { text: words.join(' '), confidence: 99, bbox: { x0: 0, y0: y, x1: 300, y1: y + 20 },
    words: words.map((text, index) => ({ text, confidence: 99, bbox: { x0: index * 45, y0: y, x1: index * 45 + 40, y1: y + 20 } })) }
}

test('Word fallback: attached and separate signs discard income and unsigned amounts', () => {
  const lines = [line(['-12,50', '€'], 0), line(['+', '500,00', '€'], 30), line(['−', '8,00', '€'], 60), line(['-', '25.00', 'EUR'], 90), line(['80,00', '€'], 120)]
  assert.deepEqual(parseLargePurchaseAmounts(lines, ''), [12.5, 8, 25])
})

test('Word fallback: split euros/cents still require a negative sign', () => {
  const lines = [line(['-12', '50', '€'], 0), line(['+500', '00', '€'], 30), line(['−', '8', '00', '€'], 60), line(['-', '25', '00', 'EUR'], 90)]
  assert.deepEqual(parseLargePurchaseAmounts(lines, ''), [12.5, 8, 25])
  assert.deepEqual(parseLargePurchaseAmounts([line(['+500,00', '€'], 0), line(['80,00', '€'], 30)], ''), [])
})

test('All 100 negative readings are retained by Gemini and both local parsers', async () => {
  const readings = Array.from({ length: 100 }, (_, index) => reading(`-${index + 1},00 €`, index + 1, index / 100))
  const expected = readings.map((row) => row.amount)
  const result = await readWithGemini(readings)
  assert.deepEqual(result.amounts, expected)
  assert.ok(result.prompt.generationConfig.maxOutputTokens >= 8192)
  assert.deepEqual(parsePurchaseAmounts(readings.map((row) => row.printed).join('\n')), expected)
  assert.deepEqual(parseLargePurchaseAmounts(readings.map((row, index) => line([row.printed], index * 30)), ''), expected)
})

test('A 100-value batch stores each capture once instead of duplicating image data', () => {
  const sources = Array.from({ length: 10 }, (_, index) => ({ id: `source-${index}`, imageDataUrl: `data:image/jpeg;base64,${index}AAA`, values: Array.from({ length: 10 }, () => 1) }))
  const batch = buildPurchaseBatch(sources)
  assert.equal(batch.values.length, 100)
  const saved = JSON.stringify(batch)
  for (const source of sources) assert.equal(saved.split(source.imageDataUrl).length - 1, 1)
  assert.deepEqual(buildPurchaseBatch(JSON.parse(saved).sources), batch)
})

test('Deleting a batch image preserves all 100 imported values', () => {
  const batch = buildPurchaseBatch([
    { id: 'first', imageDataUrl: 'data:image/jpeg;base64,AAA', values: Array.from({ length: 50 }, (_, index) => index + 1) },
    { id: 'second', imageDataUrl: 'data:image/jpeg;base64,BBB', values: Array.from({ length: 50 }, (_, index) => index + 51) },
  ])
  const result = removePurchaseBatchImage(batch, 'first')
  assert.equal(result.values.length, 100)
  assert.equal(result.values.reduce((sum, value) => sum + value, 0), 5050)
  assert.equal(getPurchaseBatchSources(result).find((source) => source.id === 'first').imageDataUrl, undefined)
})

test('Automatic transaction drafts retain data but never copy heavy images', () => {
  const draft = createTransactionFormDraft(
    { type: 'expense', amount: '7,50', category: 'Alimentación', date: '2026-11-23', description: 'Tienda' },
    { merchant: 'Tienda', total: 7.5, imageDataUrl: 'data:image/jpeg;base64,TICKET', items: [{ id: 'bread', name: 'Pan', price: 7.5 }] },
    buildPurchaseBatch([{ id: 'capture', imageDataUrl: 'data:image/jpeg;base64,CAPTURE', values: [2.5, 5] }]),
  )
  assert.equal(draft.receipt.imageDataUrl, undefined)
  assert.equal(getPurchaseBatchSources(draft.purchaseBatch)[0].imageDataUrl, undefined)
  assert.deepEqual(draft.purchaseBatch.values, [2.5, 5])
  assert.equal(draft.receipt.items[0].name, 'Pan')
})

test('CSV import accepts 100 Spanish decimal rows as lightweight movements', () => {
  const rows = Array.from({ length: 100 }, (_, index) => `gasto;${index + 1},50;Alimentación;23/11/2026;Compra ${index + 1}`)
  const result = parseTransactionsCsv(`tipo;importe;categoria;fecha;descripcion\n${rows.join('\n')}`)
  assert.equal(result.errors.length, 0)
  assert.equal(result.transactions.length, 100)
  assert.equal(result.transactions[0].amount, 1.5)
  assert.equal(result.transactions[99].amount, 100.5)
  assert.equal(result.transactions[0].date, '2026-11-23')
})

test('Receipt mode reads all 94 positive product prices with Gemini and keeps the printed total', async () => {
  const items = Array.from({ length: 94 }, (_, i) => ({ name: `Producto ${i + 1}`, price: 1, confidence: 0.99 }))
  const { receipt, prompt } = await readWithGemini([], { mode: 'receipt', receipt: { merchant: 'TIENDA', total: 94, totalConfidence: 0.99, items } })
  assert.equal(receipt.total, 94)
  assert.equal(receipt.items.length, 94)
  assert.equal(prompt.generationConfig.thinkingConfig.thinkingLevel, 'MINIMAL')
  assert.ok(prompt.generationConfig.maxOutputTokens >= 8192)
})

test('Receipt mode keeps a printed discount without adding secondary totals', async () => {
  const { receipt } = await readWithGemini([], { mode: 'receipt', receipt: { merchant: 'TIENDA', total: 9, totalConfidence: 0.99, items: [{ name: 'Producto', price: 10, confidence: 0.99 }, { name: 'Descuento', price: -1, confidence: 0.99 }, { name: 'Dudoso', price: 900, confidence: 0.1 }] } })
  assert.deepEqual(receipt.items.map((item) => item.price), [10, -1])
  assert.equal(receipt.total, 9)
})

test('An incomplete Gemini result is rejected rather than saved as a partial list', async () => {
  const result = await readWithGemini([reading('-1,00 €', 1)], { finishReason: 'MAX_TOKENS', status: 502 })
  assert.match(result.error, /incompleta/)
  assert.equal(result.amounts, undefined)
})
