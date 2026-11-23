function parsePrice(value: string): number {
  return Number(value.replace(/\s/g, '').replace(',', '.'))
}

export function parsePurchaseAmounts(text: string): number[] {
  const values: number[] = []
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  for (const line of lines) {
    const matches = [...line.matchAll(/(?:^|\s)[−-]\s*(\d{1,5}[.,]\d{2})\s*(?:€|eur)?(?=\s|$)/gi)]
    if (matches.length === 0) continue
    const candidate = parsePrice(matches[matches.length - 1][1])
    if (Number.isFinite(candidate) && candidate > 0) values.push(candidate)
  }
  return values
}

interface OcrLineLike {
  text: string
  confidence: number
  bbox: { x0: number, y0: number, x1: number, y1: number }
  words?: Array<{
    text: string
    confidence: number
    bbox: { x0: number, y0: number, x1: number, y1: number }
  }>
}

function parseOcrMoney(rawValue: string): number | null {
  const compact = rawValue
    .replace(/\s/g, '')
    .replace(/(?:€|eur)$/i, '')
    .replace('−', '-')
  const match = compact.match(/^[+-]?(\d[\d.,]*)([.,])(\d{2})$/)
  if (!match) return null
  const integerPart = match[1].replace(/[.,]/g, '')
  const amount = Number(`${integerPart}.${match[3]}`)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function parseLargePurchaseAmounts(lines: OcrLineLike[], fallbackText: string): number[] {
  const readableLines = lines.filter((line) => line.text.trim() && line.confidence >= 25)
  const words = readableLines.flatMap((line) => line.words ?? []).filter((word) => word.text.trim() && word.confidence >= 25)
  if (words.length === 0) return parsePurchaseAmounts(fallbackText)

  const candidates: Array<{ amount: number, y: number, x: number }> = []
  for (const line of readableLines) {
    const lineWords = (line.words ?? [])
      .filter((word) => word.confidence >= 25)
      .sort((first, second) => first.bbox.x0 - second.bbox.x0)

    for (let index = 0; index < lineWords.length; index += 1) {
      const word = lineWords[index]
      const height = Math.max(1, word.bbox.y1 - word.bbox.y0)
      const compact = word.text.replace(/\s/g, '')
      const previousCompact = lineWords[index - 1]?.text.replace(/\s/g, '') ?? ''
      const amount = parseOcrMoney(compact)
      if (amount !== null) {
        const negative = /^[−-]/.test(compact) || /^[−-]$/.test(previousCompact)
        const positive = /^\+/.test(compact) || previousCompact === '+'
        if (negative && !positive) candidates.push({
          amount,
          y: word.bbox.y0,
          x: /^[+−-]$/.test(previousCompact) ? lineWords[index - 1].bbox.x0 : word.bbox.x0,
        })
        continue
      }

      const euros = compact.replace('−', '-').match(/^([+-]?)(\d{1,5})$/)
      const centsWord = lineWords[index + 1]
      if (!euros || !centsWord) continue
      const cents = centsWord.text.replace(/\s/g, '').match(/^(\d{2})$/)
      const centsHeight = Math.max(1, centsWord.bbox.y1 - centsWord.bbox.y0)
      const gap = centsWord.bbox.x0 - word.bbox.x1
      if (!cents || gap < 0 || gap > Math.max(height, centsHeight) * 0.9) continue

      const splitAmount = Number(`${euros[2]}.${cents[1]}`)
      const negative = euros[1] === '-' || /^[−-]$/.test(previousCompact)
      const positive = euros[1] === '+' || previousCompact === '+'
      if (negative && !positive && Number.isFinite(splitAmount) && splitAmount > 0) candidates.push({
        amount: splitAmount,
        y: word.bbox.y0,
        x: word.bbox.x0,
      })
      index += 1
    }
  }

  return candidates
    .sort((first, second) => first.y - second.y || first.x - second.x)
    .map((candidate) => candidate.amount)
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo abrir la imagen.'))
    }
    image.src = url
  })
}

export async function compressReceiptImage(file: File): Promise<string> {
  const image = await loadImage(file)
  const scale = Math.min(1, 1000 / image.naturalWidth, 1600 / image.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar la imagen.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  let output = canvas.toDataURL('image/jpeg', 0.68)
  if (output.length > 600_000) output = canvas.toDataURL('image/jpeg', 0.45)
  return output
}

export async function compressPurchaseImage(file: File): Promise<string> {
  const image = await loadImage(file)
  const scale = Math.min(1, 820 / image.naturalWidth, 1180 / image.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar la imagen.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  let output = canvas.toDataURL('image/jpeg', 0.52)
  if (output.length > 280_000) output = canvas.toDataURL('image/jpeg', 0.34)
  return output
}
