export function parseMoneyInput(text: string): number {
  const normalized = text
    .trim()
    .replace(/[€\s]/g, '')
    .replace(/[’']/g, ',')

  if (!normalized || !/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(normalized)) return Number.NaN
  return Number(normalized.replace(',', '.'))
}

export function parseBudgetAmount(text: string): number {
  const compact = text.trim().replace(/[€\s]/g, '')
  const spanishGrouped = /^[+-]?[1-9]\d{0,2}(?:\.\d{3})+(?:[,'][0-9]{1,2}|’[0-9]{1,2})?$/
  return parseMoneyInput(spanishGrouped.test(compact) ? compact.replace(/\./g, '') : compact)
}
