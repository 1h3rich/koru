import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import DecimalInput from './DecimalInput'
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, CameraIcon, ImageIcon, PlusIcon, ReceiptIcon, TrashIcon } from './Icons'
import { readPurchaseAmountsWithGemini, readReceiptWithGemini } from './gemini'
import { addManualPurchaseBatchValue, buildPurchaseBatch, getPurchaseBatchSources, removePurchaseBatchImage, updatePurchaseBatchValue } from './purchaseBatch'
import { compressPurchaseImage, compressReceiptImage, parseLargePurchaseAmounts } from './receipt'
import { createTransactionFormDraft, hasTransactionFormDraft } from './transactionDraft'
import type { PurchaseBatch, PurchaseBatchSource, ReceiptDetails, ReceiptItem, Transaction, TransactionFormDraftData, TransactionDraft, TransactionType } from './types'

const categories: Record<TransactionType, string[]> = {
  income: ['Nómina', 'Venta', 'Freelance', 'Regalo', 'Otros ingresos'],
  expense: ['Vivienda', 'Alimentación', 'Transporte', 'Ocio', 'Salud', 'Suscripciones', 'Otros gastos'],
}

function getLocalDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = getLocalDate()
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const MAX_PURCHASE_PHOTOS = 3

interface TransactionFormProps {
  onAdd: (transaction: Transaction) => boolean | void
  savedDraft: TransactionFormDraftData | null
  onDraftChange: (draft: TransactionFormDraftData | null) => void
}

export default function TransactionForm({ onAdd, savedDraft, onDraftChange }: TransactionFormProps) {
  const emptyDraft: TransactionDraft = {
    type: 'expense',
    amount: '',
    category: categories.expense[0],
    date: today,
    description: '',
  }
  const [draft, setDraft] = useState<TransactionDraft>(() => savedDraft?.draft ?? emptyDraft)
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(() => savedDraft?.receipt ?? null)
  const [purchaseBatch, setPurchaseBatch] = useState<PurchaseBatch | null>(() => savedDraft?.purchaseBatch ?? null)
  const [photos, setPhotos] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [addingPhotos, setAddingPhotos] = useState(false)
  const [batchScanning, setBatchScanning] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchError, setBatchError] = useState('')
  const [batchNotice, setBatchNotice] = useState('')
  const [error, setError] = useState('')

  const availableCategories = useMemo(() => categories[draft.type], [draft.type])
  const receiptItemsTotal = receipt?.items.reduce((sum, item) => sum + item.price, 0) ?? 0
  const draftData = useMemo(() => createTransactionFormDraft(draft, receipt, purchaseBatch), [draft, purchaseBatch, receipt])
  const hasDraft = hasTransactionFormDraft(draftData)

  useEffect(() => {
    const timer = window.setTimeout(() => onDraftChange(hasDraft ? draftData : null), 350)
    return () => window.clearTimeout(timer)
  }, [draftData, hasDraft, onDraftChange])

  function setType(type: TransactionType) {
    setDraft((current) => ({ ...current, type, category: categories[type][0] }))
  }

  async function handleReceiptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setScanError('Selecciona una fotografía del ticket.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setScanError('La imagen es demasiado grande. Usa una foto de menos de 15 MB.')
      return
    }

    setScanning(true)
    setScanError('')
    try {
      const imageDataUrl = await compressReceiptImage(file)
      const parsed = await readReceiptWithGemini(imageDataUrl)
      const nextReceipt: ReceiptDetails = { ...parsed, imageDataUrl }
      setReceipt(nextReceipt)
      setPurchaseBatch(null)
      setDraft((current) => ({
        ...current,
        type: 'expense',
        amount: parsed.total > 0 ? String(parsed.total).replace('.', ',') : '',
        description: parsed.merchant,
      }))
      if (parsed.items.length === 0) setScanError('Gemini no pudo separar los productos. Puedes añadirlos manualmente.')
    } catch (readError) {
      setScanError(readError instanceof Error ? readError.message : 'No pude leer el ticket con Gemini.')
    } finally {
      setScanning(false)
    }
  }

  async function handlePurchasePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = [...(event.target.files ?? [])]
    event.target.value = ''
    if (selected.length === 0) return
    const available = MAX_PURCHASE_PHOTOS - photos.length
    const files = selected.slice(0, Math.max(0, available))
    if (files.length === 0) {
      setPhotoError(`Puedes guardar hasta ${MAX_PURCHASE_PHOTOS} fotos por compra.`)
      return
    }
    if (files.some((file) => !file.type.startsWith('image/') || file.size > 15 * 1024 * 1024)) {
      setPhotoError('Usa imágenes de menos de 15 MB.')
      return
    }
    setAddingPhotos(true)
    setPhotoError('')
    try {
      const compressed = await Promise.all(files.map(compressPurchaseImage))
      setPhotos((current) => [...current, ...compressed].slice(0, MAX_PURCHASE_PHOTOS))
      if (selected.length > available) setPhotoError(`Se han guardado las primeras ${MAX_PURCHASE_PHOTOS} fotos.`)
    } catch {
      setPhotoError('No pude preparar una de las fotos.')
    } finally {
      setAddingPhotos(false)
    }
  }

  function applyPurchaseBatch(batch: PurchaseBatch | null) {
    setPurchaseBatch(batch)
    const total = batch?.values.reduce((sum, value) => sum + value, 0) ?? 0
    setDraft((current) => ({ ...current, amount: total > 0 ? String(Number(total.toFixed(2))).replace('.', ',') : '' }))
  }

  function changeBatchValue(index: number, value?: number) {
    if (!purchaseBatch) return
    applyPurchaseBatch(updatePurchaseBatchValue(purchaseBatch, index, value))
  }

  function addBatchValue() {
    if (!purchaseBatch) return
    applyPurchaseBatch(addManualPurchaseBatchValue(purchaseBatch))
  }

  function removeBatchImage(sourceId: string) {
    if (!purchaseBatch) return
    setPurchaseBatch(removePurchaseBatchImage(purchaseBatch, sourceId))
    setBatchNotice('Imagen eliminada. Los importes siguen guardados.')
    setBatchError('')
  }

  async function handlePurchaseBatch(event: ChangeEvent<HTMLInputElement>, preferGemini: boolean) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    if (files.some((file) => !file.type.startsWith('image/') || file.size > 15 * 1024 * 1024)) {
      setBatchError('Usa imágenes de menos de 15 MB cada una.')
      return
    }
    setBatchScanning(true)
    setBatchProgress(2)
    setBatchError('')
    setBatchNotice('')
    let worker: Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>> | null = null
    let currentFileIndex = 0
    try {
      const addedSources: PurchaseBatchSource[] = []

      for (currentFileIndex = 0; currentFileIndex < files.length; currentFileIndex += 1) {
        const file = files[currentFileIndex]
        const imageDataUrl = await compressPurchaseImage(file)
        setBatchProgress(Math.max(3, Math.round((currentFileIndex / files.length) * 100)))

        let detected: number[] = []
        if (preferGemini) {
          detected = await readPurchaseAmountsWithGemini(imageDataUrl)
        } else {
          if (!worker) {
            const { createWorker } = await import('tesseract.js')
            worker = await createWorker('spa+eng', 1, {
              logger: (message) => {
                if (typeof message.progress !== 'number') return
                const overall = ((currentFileIndex + message.progress) / files.length) * 100
                setBatchProgress(Math.max(3, Math.min(99, Math.round(overall))))
              },
            })
          }
          const result = await worker.recognize(file, {}, { text: true, blocks: true })
          const lines = result.data.blocks?.flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines)) ?? []
          detected = parseLargePurchaseAmounts(lines, result.data.text)
        }

        addedSources.push({ id: crypto.randomUUID(), imageDataUrl, values: detected })
      }

      const existingSources = purchaseBatch ? getPurchaseBatchSources(purchaseBatch) : []
      const batch = buildPurchaseBatch([...existingSources, ...addedSources])
      const values = batch?.values ?? []
      applyPurchaseBatch(batch)
      setReceipt(null)
      if (values.length === 0) {
        setBatchError('No encontré gastos con signo negativo claro. Puedes añadirlos manualmente.')
      } else {
        setDraft((current) => ({ ...current, description: current.description || 'Compras con tarjeta' }))
        const photoLabel = files.length === 1 ? '1 foto' : `${files.length} fotos`
        setBatchNotice(`${photoLabel} añadidas${preferGemini ? ' con Gemini' : ' sin IA'}. Revisa los importes antes de guardar.`)
      }
    } catch (readError) {
      setBatchError(readError instanceof Error ? readError.message : 'No pude leer las imágenes. Puedes añadir los importes manualmente.')
    } finally {
      if (worker) await worker.terminate()
      setBatchScanning(false)
      setBatchProgress(0)
    }
  }

  function updateReceiptItem(id: string, changes: Partial<ReceiptItem>) {
    setReceipt((current) => current ? {
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, ...changes } : item),
    } : current)
  }

  function useItemsTotal() {
    if (!receipt) return
    setReceipt({ ...receipt, total: receiptItemsTotal })
    setDraft({ ...draft, amount: String(receiptItemsTotal).replace('.', ',') })
  }

  function discardReceipt() {
    if (!receipt) return
    const receiptAmount = String(receipt.total).replace('.', ',')
    setDraft((current) => ({
      ...current,
      amount: current.amount === receiptAmount ? '' : current.amount,
      description: current.description === receipt.merchant ? '' : current.description,
    }))
    setReceipt(null)
    setScanError('')
  }

  function discardPurchaseBatch() {
    const batchTotal = purchaseBatch?.values.reduce((sum, value) => sum + value, 0) ?? 0
    const batchAmount = String(Number(batchTotal.toFixed(2))).replace('.', ',')
    setDraft((current) => ({
      ...current,
      amount: current.amount === batchAmount ? '' : current.amount,
      description: current.description === 'Compras con tarjeta' ? '' : current.description,
    }))
    setPurchaseBatch(null)
    setBatchError('')
    setBatchNotice('')
    setBatchProgress(0)
  }

  function clearAllData() {
    setDraft(emptyDraft)
    setReceipt(null)
    setPurchaseBatch(null)
    setPhotos([])
    setScanError('')
    setPhotoError('')
    setBatchError('')
    setBatchNotice('')
    setError('')
    onDraftChange(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(draft.amount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Introduce un importe mayor que cero.')
      return
    }

    const now = Date.now()
    const saved = onAdd({
      id: crypto.randomUUID(),
      type: draft.type,
      amount,
      category: draft.category,
      date: draft.date,
      description: draft.description.trim(),
      createdAt: now,
      updatedAt: now,
      receipt: draft.type === 'expense' && receipt ? { ...receipt, total: amount } : undefined,
      photos: draft.type === 'expense' && photos.length ? photos : undefined,
      purchaseBatch: draft.type === 'expense' && purchaseBatch?.values.length ? purchaseBatch : undefined,
    })
    if (saved === false) {
      setError('No se pudo guardar. Elimina alguna foto o libera espacio y vuelve a intentarlo.')
      return
    }
    setDraft((current) => ({ ...current, amount: '', description: '' }))
    setReceipt(null)
    setPurchaseBatch(null)
    setPhotos([])
    setScanError('')
    setError('')
    onDraftChange(null)
  }

  return (
    <details id="add-panel" className="panel add-panel">
      <summary className="transaction-manager-summary">
        <div className="transaction-manager-icon"><PlusIcon /></div>
        <div>
          <strong id="add-title">Apuntar movimiento</strong>
          <span>Añadir un ingreso, gasto o ticket</span>
        </div>
        <span className="details-plus" aria-hidden="true">+</span>
      </summary>

      <form className="transaction-form transaction-form-content" onSubmit={handleSubmit}>
        <div className={`draft-banner ${hasDraft ? 'has-data' : ''}`} role="status">
          <div>
            <strong>{hasDraft ? 'Borrador guardado' : 'Borrador automático'}</strong>
            <span>Los datos se guardan cifrados; las imágenes no forman parte del borrador.</span>
          </div>
          {hasDraft && <button type="button" onClick={clearAllData}><TrashIcon /> Borrar datos</button>}
        </div>
        <fieldset className="type-toggle">
          <legend>Tipo de movimiento</legend>
          <button type="button" className={draft.type === 'income' ? 'active income' : ''} onClick={() => setType('income')} aria-pressed={draft.type === 'income'}>
            <ArrowUpIcon /> Ingreso
          </button>
          <button type="button" className={draft.type === 'expense' ? 'active expense' : ''} onClick={() => setType('expense')} aria-pressed={draft.type === 'expense'}>
            <ArrowDownIcon /> Gasto
          </button>
        </fieldset>

        {draft.type === 'expense' && (
          <section className={`receipt-scanner ${receipt ? 'has-receipt' : ''}`} aria-labelledby="receipt-scanner-title">
            <div className="receipt-scanner-heading">
              <span><ReceiptIcon /></span>
              <div>
                <strong id="receipt-scanner-title">Leer un ticket</strong>
                <small>Gemini lee la foto. Revisa los datos.</small>
              </div>
              <label className="receipt-upload-button" htmlFor="receipt-upload">
                <CameraIcon /> {receipt ? 'Cambiar' : 'Fotografiar'}
              </label>
              <input id="receipt-upload" className="receipt-file-input" type="file" accept="image/*" capture="environment" onChange={handleReceiptFile} disabled={scanning} />
            </div>

            {scanning && (
              <div className="receipt-scan-progress" role="status">
                <p>Leyendo el ticket con Gemini…</p>
              </div>
            )}

            {receipt && !scanning && (
              <div className="receipt-review">
                <div className="receipt-review-top">
                  {receipt.imageDataUrl && <div className="removable-source-image"><img src={receipt.imageDataUrl} alt="Vista previa del ticket" /><button type="button" onClick={() => setReceipt({ ...receipt, imageDataUrl: undefined })}><TrashIcon /> Borrar solo imagen</button></div>}
                  <div className="field">
                    <label htmlFor="receipt-merchant">Comercio</label>
                    <input id="receipt-merchant" value={receipt.merchant} onChange={(event) => {
                      setReceipt({ ...receipt, merchant: event.target.value })
                      setDraft({ ...draft, description: event.target.value })
                    }} />
                  </div>
                  <div className="field">
                    <label htmlFor="receipt-total">Total del ticket</label>
                    <div className="amount-input">
                      <span>€</span>
                      <DecimalInput id="receipt-total" value={receipt.total} onValueChange={(value, text) => {
                        setReceipt({ ...receipt, total: value })
                        setDraft({ ...draft, amount: text })
                      }} />
                    </div>
                  </div>
                </div>

                <div className="receipt-items-heading">
                  <div><strong>Productos</strong><span>{receipt.items.length}</span></div>
                  <button type="button" onClick={() => setReceipt({ ...receipt, items: [...receipt.items, { id: crypto.randomUUID(), name: 'Nuevo producto', price: 0 }] })}>
                    <PlusIcon /> Añadir línea
                  </button>
                </div>

                <div className="receipt-items-editor">
                  {receipt.items.map((item) => (
                    <div className="receipt-item-editor" key={item.id}>
                      <input aria-label="Producto" value={item.name} onChange={(event) => updateReceiptItem(item.id, { name: event.target.value })} />
                      <div className="receipt-price-input"><span>€</span><DecimalInput aria-label={`Precio de ${item.name}`} value={item.price} onValueChange={(price) => updateReceiptItem(item.id, { price })} /></div>
                      <button type="button" className="icon-button" onClick={() => setReceipt({ ...receipt, items: receipt.items.filter((current) => current.id !== item.id) })} aria-label={`Eliminar ${item.name}`}><TrashIcon /></button>
                    </div>
                  ))}
                </div>

                <div className="receipt-items-total">
                  <span>Suma de productos <b>{currency.format(receiptItemsTotal)}</b></span>
                  {Math.abs(receiptItemsTotal - receipt.total) > 0.009 && <button type="button" onClick={useItemsTotal}>Usar esta suma</button>}
                </div>
                <button type="button" className="discard-content-button" onClick={discardReceipt}><TrashIcon /> Borrar datos del ticket</button>
              </div>
            )}
          </section>
        )}

        {scanError && <p className="receipt-scan-error" role="alert">{scanError}</p>}

        {draft.type === 'expense' && (
          <section className={`purchase-batch-scanner ${purchaseBatch ? 'has-result' : ''}`} aria-labelledby="purchase-batch-title">
            <div className="purchase-tool-heading">
              <span><ImageIcon /></span>
              <div><strong id="purchase-batch-title">Sumar varias compras</strong><small>Selecciona una o varias capturas.</small></div>
              <div className="purchase-scan-actions">
                <label className="receipt-upload-button" htmlFor="purchase-batch-upload"><ImageIcon /> Añadir con Gemini</label>
                <label className="receipt-upload-button secondary" htmlFor="purchase-batch-local-upload"><CameraIcon /> Añadir sin IA</label>
              </div>
              <input id="purchase-batch-upload" className="receipt-file-input" type="file" accept="image/*" multiple onChange={(event) => handlePurchaseBatch(event, true)} disabled={batchScanning} />
              <input id="purchase-batch-local-upload" className="receipt-file-input" type="file" accept="image/*" multiple onChange={(event) => handlePurchaseBatch(event, false)} disabled={batchScanning} />
            </div>

            <p className="gemini-disclosure">Gemini gratuito envía las imágenes a Google solo al pulsarlo. Google puede usarlas para mejorar sus productos. “Sin IA” las procesa únicamente en tu móvil.</p>

            {(batchScanning || batchError || batchNotice) && <div className="purchase-batch-feedback">
              {batchScanning && <div className="receipt-scan-progress" role="status"><div><span style={{ width: `${batchProgress}%` }} /></div><p>Procesando fotos… {batchProgress}%</p></div>}
              {batchError && <p className="receipt-scan-error" role="alert">{batchError}</p>}
              {batchNotice && <p className="purchase-photo-status" role="status">{batchNotice}</p>}
            </div>}

            {purchaseBatch && !batchScanning && (
              <div className="purchase-values-review">
                <button type="button" className="discard-content-button batch-discard" onClick={discardPurchaseBatch}><TrashIcon /> Borrar datos de las compras</button>
                <div className="purchase-batch-thumbnails">
                  {getPurchaseBatchSources(purchaseBatch).filter((source) => source.imageDataUrl).map((source, index) => <div className="purchase-batch-thumbnail" key={source.id}><img src={source.imageDataUrl} alt={`Captura de compras ${index + 1}`} /><button type="button" className="icon-button" onClick={() => removeBatchImage(source.id)} aria-label={`Borrar solo la imagen ${index + 1}`} title="Borrar solo la imagen; conservar importes"><TrashIcon /></button></div>)}
                </div>
                <div className="purchase-values-list">
                  {purchaseBatch.values.map((value, index) => (
                    <div key={`${index}-${purchaseBatch.values.length}`}>
                      <label htmlFor={`purchase-value-${index}`}>Valor {index + 1}</label>
                      <div className="amount-input"><span>€</span><input id={`purchase-value-${index}`} inputMode="text" defaultValue={String(value).replace('.', ',')} onChange={(event) => {
                        changeBatchValue(index, Number(event.target.value.replace(',', '.')) || 0)
                      }} /></div>
                      <button type="button" className="icon-button" onClick={() => changeBatchValue(index)} aria-label={`Quitar valor ${index + 1}`}><TrashIcon /></button>
                    </div>
                  ))}
                  <button type="button" className="purchase-add-value" onClick={addBatchValue}><PlusIcon /> Añadir valor manual</button>
                  <p>Total detectado <strong>{currency.format(purchaseBatch.values.reduce((sum, value) => sum + value, 0))}</strong></p>
                </div>
              </div>
            )}
          </section>
        )}

        {draft.type === 'expense' && (
          <section className="purchase-photos" aria-labelledby="purchase-photos-title">
            <div className="purchase-tool-heading">
              <span><CameraIcon /></span>
              <div><strong id="purchase-photos-title">Fotos de la compra</strong><small>Opcional · no se leen como ticket.</small></div>
              <label className="receipt-upload-button" htmlFor="purchase-photos-upload"><PlusIcon /> Añadir</label>
              <input id="purchase-photos-upload" className="receipt-file-input" type="file" accept="image/*" multiple onChange={handlePurchasePhotos} disabled={addingPhotos || photos.length >= MAX_PURCHASE_PHOTOS} />
            </div>
            {addingPhotos && <p className="purchase-photo-status" role="status">Preparando fotos…</p>}
            {photoError && <p className="receipt-scan-error" role="alert">{photoError}</p>}
            {photos.length > 0 && <div className="purchase-photo-grid">{photos.map((photo, index) => <div key={`${photo.slice(-18)}-${index}`}><img src={photo} alt={`Foto de la compra ${index + 1}`} /><button type="button" className="icon-button" onClick={() => setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label={`Quitar foto ${index + 1}`}><TrashIcon /></button></div>)}</div>}
          </section>
        )}

        <div className="form-grid">
          <div className="field amount-field">
            <label htmlFor="amount">Importe</label>
            <div className="amount-input"><span>€</span><input id="amount" inputMode="text" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} placeholder="0,00" aria-describedby={error ? 'amount-error' : undefined} required /></div>
          </div>

          <div className="field">
            <label htmlFor="category">Categoría</label>
            <select id="category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
              {availableCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="date">Fecha</label>
            <div className="date-picker-shell">
              <span>{dateFormatter.format(new Date(`${draft.date}T12:00:00`))}</span><CalendarIcon />
              <input id="date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required />
            </div>
          </div>

          <div className="field field-wide">
            <label htmlFor="description">Descripción <span>(opcional)</span></label>
            <input id="description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Ej. compra semanal" maxLength={80} />
          </div>
        </div>

        {error && <p id="amount-error" className="form-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button add-button"><PlusIcon /> Guardar {draft.type === 'income' ? 'ingreso' : receipt ? 'ticket' : 'gasto'}</button>
      </form>
    </details>
  )
}
