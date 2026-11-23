import type { Transaction, TransactionType } from './types'

export interface CsvImportResult {
  transactions: Transaction[]
  errors: string[]
}

const HEADER_ALIASES = {
  type: ['tipo', 'type'],
  amount: ['importe', 'amount', 'valor'],
  category: ['categoria', 'category'],
  date: ['fecha', 'date'],
  description: ['descripcion', 'description', 'concepto'],
} as const

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function delimiterFor(text: string): ',' | ';' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  return (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
}

function parseRows(text: string, delimiter: ',' | ';'): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else quoted = !quoted
    } else if (character === delimiter && !quoted) {
      row.push(field.trim())
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ''
    } else field += character
  }
  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function columnIndex(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header))
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[€\s]/g, '').replace(/^[-+]/, '')
  const decimalSeparator = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.'
  const normalized = decimalSeparator === ','
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/,/g, '')
  return Number(normalized)
}

function parseType(value: string): TransactionType | null {
  const normalized = normalizeHeader(value)
  if (!normalized || ['gasto', 'expense', 'salida'].includes(normalized)) return 'expense'
  if (['ingreso', 'income', 'entrada'].includes(normalized)) return 'income'
  return null
}

function localDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function parseDate(value: string): string | null {
  if (!value.trim()) return localDate()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`))) return value
  const spanish = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!spanish) return null
  const date = `${spanish[3]}-${spanish[2].padStart(2, '0')}-${spanish[1].padStart(2, '0')}`
  return Number.isNaN(Date.parse(`${date}T12:00:00`)) ? null : date
}

export function parseTransactionsCsv(text: string): CsvImportResult {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return { transactions: [], errors: [] }
  const rows = parseRows(trimmed, delimiterFor(trimmed))
  if (rows.length < 2) return { transactions: [], errors: ['El CSV necesita una cabecera y al menos una fila.'] }

  const headers = rows[0].map(normalizeHeader)
  const indexes = {
    type: columnIndex(headers, HEADER_ALIASES.type),
    amount: columnIndex(headers, HEADER_ALIASES.amount),
    category: columnIndex(headers, HEADER_ALIASES.category),
    date: columnIndex(headers, HEADER_ALIASES.date),
    description: columnIndex(headers, HEADER_ALIASES.description),
  }
  if (indexes.amount < 0) return { transactions: [], errors: ['Falta la columna «importe».'] }

  const transactions: Transaction[] = []
  const errors: string[] = []
  const now = Date.now()
  for (const [rowIndex, row] of rows.slice(1, 1001).entries()) {
    const line = rowIndex + 2
    const type = parseType(indexes.type >= 0 ? row[indexes.type] ?? '' : '')
    const amount = parseAmount(row[indexes.amount] ?? '')
    const date = parseDate(indexes.date >= 0 ? row[indexes.date] ?? '' : '')
    if (!type) {
      errors.push(`Fila ${line}: tipo desconocido.`)
      continue
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Fila ${line}: importe no válido.`)
      continue
    }
    if (!date) {
      errors.push(`Fila ${line}: fecha no válida.`)
      continue
    }
    transactions.push({
      id: crypto.randomUUID(),
      type,
      amount: Number(amount.toFixed(2)),
      category: (indexes.category >= 0 ? row[indexes.category] : '')?.trim() || (type === 'income' ? 'Otros ingresos' : 'Otros gastos'),
      date,
      description: ((indexes.description >= 0 ? row[indexes.description] : '') ?? '').trim().slice(0, 80),
      createdAt: now + rowIndex,
      updatedAt: now + rowIndex,
    })
  }
  if (rows.length > 1001) errors.push('Solo se han preparado las primeras 1.000 filas.')
  return { transactions, errors }
}

export const CSV_TEMPLATE = 'tipo;importe;categoria;fecha;descripcion\ngasto;12,50;Alimentación;2026-11-23;Compra semanal\ningreso;1000,00;Nómina;2026-11-01;Nómina noviembre'
