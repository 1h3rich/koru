export function parseMoneyInput(text: string): number {
  const normalized = text
    .trim()
    .replace(/[€\s]/g, '')
    .replace(/[’']/g, ',')

  if (!normalized || !/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(normalized)) return Number.NaN
  return Number(normalized.replace(',', '.'))
}
