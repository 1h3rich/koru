import type { PurchaseBatch, PurchaseBatchSource } from './types'

export function getPurchaseBatchSources(batch: PurchaseBatch): PurchaseBatchSource[] {
  if (batch.sources?.length) {
    return batch.sources.map((source) => ({ ...source, values: [...source.values] }))
  }

  const images = batch.imageDataUrls?.length
    ? batch.imageDataUrls
    : batch.imageDataUrl
      ? [batch.imageDataUrl]
      : []

  if (images.length === 0) return [{ id: 'legacy-manual', values: [...batch.values] }]
  return images.map((imageDataUrl, index) => ({
    id: `legacy-${index}`,
    imageDataUrl,
    values: index === 0 ? [...batch.values] : [],
  }))
}

export function buildPurchaseBatch(sources: PurchaseBatchSource[]): PurchaseBatch | null {
  const keptSources = sources
    .filter((source) => source.imageDataUrl || source.values.length > 0)
    .map((source) => ({ ...source, values: [...source.values] }))
  if (keptSources.length === 0) return null

  return {
    values: keptSources.flatMap((source) => source.values),
    sources: keptSources,
  }
}

export function updatePurchaseBatchValue(batch: PurchaseBatch, targetIndex: number, value?: number): PurchaseBatch | null {
  const sources = getPurchaseBatchSources(batch)
  let currentIndex = 0
  for (const source of sources) {
    const localIndex = targetIndex - currentIndex
    if (localIndex >= 0 && localIndex < source.values.length) {
      if (value === undefined) source.values.splice(localIndex, 1)
      else source.values[localIndex] = value
      return buildPurchaseBatch(sources)
    }
    currentIndex += source.values.length
  }
  return buildPurchaseBatch(sources)
}

export function addManualPurchaseBatchValue(batch: PurchaseBatch, value = 0): PurchaseBatch {
  const sources = getPurchaseBatchSources(batch)
  const manualSource = sources.find((source) => !source.imageDataUrl)
  if (manualSource) manualSource.values.push(value)
  else sources.push({ id: crypto.randomUUID(), values: [value] })
  return buildPurchaseBatch(sources)!
}

export function removePurchaseBatchImage(batch: PurchaseBatch, sourceId: string): PurchaseBatch {
  const sources = getPurchaseBatchSources(batch).map((source) => (
    source.id === sourceId ? { ...source, imageDataUrl: undefined } : source
  ))
  return buildPurchaseBatch(sources)!
}

export function withoutPurchaseBatchImages(batch: PurchaseBatch | null): PurchaseBatch | null {
  if (!batch) return null
  return buildPurchaseBatch(getPurchaseBatchSources(batch).map((source) => ({
    id: source.id,
    values: [...source.values],
  })))
}
