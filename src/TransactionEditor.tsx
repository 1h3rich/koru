import { useState, type ChangeEvent, type FormEvent } from 'react'
import DecimalInput from './DecimalInput'
import { CameraIcon, CheckIcon, ImageIcon, PlusIcon, ReceiptIcon, TrashIcon } from './Icons'
import { addManualPurchaseBatchValue, getPurchaseBatchSources, removePurchaseBatchImage, updatePurchaseBatchValue } from './purchaseBatch'
import { compressPurchaseImage } from './receipt'
import { parseMoneyInput } from './money'
import type { PurchaseBatch } from './types'
import type { ReceiptItem, Transaction, TransactionType } from './types'

const categories: Record<TransactionType, string[]> = {
  income: ['Nómina', 'Venta', 'Freelance', 'Regalo', 'Otros ingresos'],
  expense: ['Vivienda', 'Alimentación', 'Transporte', 'Ocio', 'Salud', 'Suscripciones', 'Comisiones cripto', 'Otros gastos'],
}
const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

interface TransactionEditorProps {
  transaction: Transaction
  today: string
  onSave: (transaction: Transaction) => boolean | void
  fixedPayment?: boolean
  onClose: () => void
}

export default function TransactionEditor({ transaction, today, fixedPayment, onSave, onClose }: TransactionEditorProps) {
  const [draft, setDraft] = useState<Transaction>(() => ({
    ...transaction,
    receipt: transaction.receipt ? { ...transaction.receipt, items: transaction.receipt.items.map((item) => ({ ...item })) } : undefined,
    photos: transaction.photos ? [...transaction.photos] : undefined,
    purchaseBatch: transaction.purchaseBatch ? { ...transaction.purchaseBatch, values: [...transaction.purchaseBatch.values], imageDataUrls: transaction.purchaseBatch.imageDataUrls ? [...transaction.purchaseBatch.imageDataUrls] : undefined, sources: transaction.purchaseBatch.sources?.map((source) => ({ ...source, values: [...source.values] })) } : undefined,
  }))
  const [amount, setAmount] = useState(() => String(transaction.amount).replace('.', ','))
  const [photoError, setPhotoError] = useState('')
  const [addingPhotos, setAddingPhotos] = useState(false)
  const [mediaNotice, setMediaNotice] = useState('')

  function updateItem(id: string, changes: Partial<ReceiptItem>) {
    if (!draft.receipt) return
    setDraft({ ...draft, receipt: { ...draft.receipt, items: draft.receipt.items.map((item) => item.id === id ? { ...item, ...changes } : item) } })
  }

  function applyPurchaseBatch(batch: PurchaseBatch | null) {
    const total = batch?.values.reduce((sum, value) => sum + value, 0) ?? 0
    setDraft((current) => ({ ...current, purchaseBatch: batch ?? undefined }))
    setAmount(total > 0 ? String(Number(total.toFixed(2))).replace('.', ',') : '')
  }

  function changePurchaseValue(index: number, value?: number) {
    if (!draft.purchaseBatch) return
    applyPurchaseBatch(updatePurchaseBatchValue(draft.purchaseBatch, index, value))
  }

  function addPurchaseValue() {
    if (!draft.purchaseBatch) return
    applyPurchaseBatch(addManualPurchaseBatchValue(draft.purchaseBatch))
  }

  function removePurchaseSource(sourceId: string) {
    if (!draft.purchaseBatch) return
    setDraft((current) => current.purchaseBatch ? { ...current, purchaseBatch: removePurchaseBatchImage(current.purchaseBatch, sourceId) } : current)
    setMediaNotice('Imagen eliminada. Los importes siguen guardados.')
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = [...(event.target.files ?? [])]
    event.target.value = ''
    if (selected.length === 0) return
    const currentPhotos = draft.photos ?? []
    const available = 3 - currentPhotos.length
    const files = selected.slice(0, Math.max(0, available))
    if (files.length === 0) {
      setPhotoError('Puedes guardar hasta 3 fotos por compra.')
      return
    }
    setAddingPhotos(true)
    setPhotoError('')
    try {
      const compressed = await Promise.all(files.map(compressPurchaseImage))
      setDraft((current) => ({ ...current, photos: [...(current.photos ?? []), ...compressed].slice(0, 3) }))
    } catch {
      setPhotoError('No pude preparar una de las fotos.')
    } finally {
      setAddingPhotos(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const nextAmount = parseMoneyInput(amount)
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) return
    const saved = onSave({
      ...draft,
      amount: nextAmount,
      updatedAt: Date.now(),
      receipt: draft.type === 'expense' && draft.receipt ? { ...draft.receipt, total: nextAmount } : undefined,
      photos: draft.type === 'expense' && draft.photos?.length ? draft.photos : undefined,
      purchaseBatch: draft.type === 'expense' && draft.purchaseBatch?.values.length ? draft.purchaseBatch : undefined,
    })
    if (saved === false) {
      setPhotoError('No se pudo guardar. Elimina alguna foto o libera espacio y vuelve a intentarlo.')
      return
    }
    onClose()
  }

  return (
    <div className="editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="transaction-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="editor-heading"><div><span>Corregir movimiento</span><h2 id="editor-title">Editar datos</h2></div><button type="button" onClick={onClose}>Cerrar</button></div>
        <form onSubmit={submit}>
          <div className="type-toggle compact-toggle">
            {(['income', 'expense'] as TransactionType[]).map((type) => <button type="button" key={type} className={draft.type === type ? `active ${type}` : ''} aria-pressed={draft.type === type} disabled={type === 'income' ? fixedPayment : !!draft.incomeReceipt} onClick={() => setDraft({ ...draft, type, category: categories[type][0] })}>{type === 'income' ? 'Ingreso' : 'Gasto'}</button>)}
          </div>
          <div className="form-grid">
            <div className="field amount-field"><label htmlFor="edit-amount">Importe</label><div className="amount-input"><span>€</span><input id="edit-amount" inputMode="text" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div></div>
            <div className="field"><label htmlFor="edit-category">Categoría</label><select id="edit-category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{[...new Set([...categories[draft.type], draft.category])].map((category) => <option key={category}>{category}</option>)}</select></div>
            <div className="field"><label htmlFor="edit-date">Fecha</label><input id="edit-date" type="date" max={fixedPayment || draft.incomeReceipt ? today : undefined} value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></div>
            <div className="field"><label htmlFor="edit-description">Descripción</label><input id="edit-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div>
          </div>

          {draft.receipt && (
            <div className="editor-receipt">
              <div className="editor-receipt-title"><div><ReceiptIcon /><strong>Datos del ticket</strong></div>{draft.receipt.imageDataUrl && <div className="removable-source-image compact"><img src={draft.receipt.imageDataUrl} alt="Ticket guardado" /><button type="button" onClick={() => { setDraft({ ...draft, receipt: { ...draft.receipt!, imageDataUrl: undefined } }); setMediaNotice('Imagen eliminada. Los productos siguen guardados.') }}><TrashIcon /> Borrar solo imagen</button></div>}</div>
              <div className="field"><label htmlFor="edit-merchant">Comercio</label><input id="edit-merchant" value={draft.receipt.merchant} onChange={(event) => setDraft({ ...draft, receipt: { ...draft.receipt!, merchant: event.target.value } })} /></div>
              <div className="receipt-items-heading"><div><strong>Productos</strong><span>{draft.receipt.items.length}</span></div><button type="button" onClick={() => setDraft({ ...draft, receipt: { ...draft.receipt!, items: [...draft.receipt!.items, { id: crypto.randomUUID(), name: 'Nuevo producto', price: 0 }] } })}><PlusIcon /> Añadir línea</button></div>
              <div className="receipt-items-editor">
                {draft.receipt.items.map((item) => <div className="receipt-item-editor" key={item.id}><input aria-label="Producto" value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} /><div className="receipt-price-input"><span>€</span><DecimalInput aria-label={`Precio de ${item.name}`} value={item.price} onValueChange={(price) => updateItem(item.id, { price })} /></div><button type="button" className="icon-button" onClick={() => setDraft({ ...draft, receipt: { ...draft.receipt!, items: draft.receipt!.items.filter((current) => current.id !== item.id) } })}><TrashIcon /></button></div>)}
              </div>
              <button type="button" className="discard-content-button" onClick={() => setDraft({ ...draft, receipt: undefined })}><TrashIcon /> Borrar datos del ticket</button>
            </div>
          )}

          {draft.purchaseBatch && (
            <div className="editor-purchase-batch">
              <div className="editor-receipt-title"><div><ImageIcon /><strong>Compras de las capturas</strong></div><div className="editor-batch-images">{getPurchaseBatchSources(draft.purchaseBatch).filter((source) => source.imageDataUrl).map((source, index) => <div key={source.id}><img src={source.imageDataUrl} alt={`Captura original ${index + 1}`} /><button type="button" className="icon-button" onClick={() => removePurchaseSource(source.id)} aria-label={`Borrar solo la imagen ${index + 1}`} title="Borrar solo imagen; conservar importes"><TrashIcon /></button></div>)}</div></div>
              <div className="purchase-values-list">
                {draft.purchaseBatch.values.map((value, index) => <div key={`${index}-${draft.purchaseBatch!.values.length}`}><label htmlFor={`edit-purchase-value-${index}`}>Valor {index + 1}</label><div className="amount-input"><span>€</span><input id={`edit-purchase-value-${index}`} inputMode="text" defaultValue={String(value).replace('.', ',')} onChange={(event) => changePurchaseValue(index, parseMoneyInput(event.target.value) || 0)} /></div><button type="button" className="icon-button" onClick={() => changePurchaseValue(index)}><TrashIcon /></button></div>)}
                <button type="button" className="purchase-add-value" onClick={addPurchaseValue}><PlusIcon /> Añadir valor manual</button>
                <p>Total <strong>{currency.format(draft.purchaseBatch.values.reduce((sum, value) => sum + value, 0))}</strong></p>
              </div>
              <button type="button" className="discard-content-button" onClick={() => setDraft({ ...draft, purchaseBatch: undefined })}><TrashIcon /> Borrar datos de las compras</button>
            </div>
          )}

          {mediaNotice && <p className="purchase-photo-status" role="status">{mediaNotice}</p>}

          {draft.type === 'expense' && (
            <div className="editor-photos">
              <div className="editor-photos-heading"><div><CameraIcon /><strong>Fotos de la compra</strong></div><label className="receipt-upload-button" htmlFor="edit-purchase-photos"><PlusIcon /> Añadir</label><input id="edit-purchase-photos" className="receipt-file-input" type="file" accept="image/*" multiple onChange={addPhotos} disabled={addingPhotos || (draft.photos?.length ?? 0) >= 3} /></div>
              {addingPhotos && <p className="purchase-photo-status" role="status">Preparando fotos…</p>}
              {photoError && <p className="receipt-scan-error" role="alert">{photoError}</p>}
              {draft.photos?.length ? <div className="purchase-photo-grid">{draft.photos.map((photo, index) => <div key={`${photo.slice(-18)}-${index}`}><img src={photo} alt={`Foto de la compra ${index + 1}`} /><button type="button" className="icon-button" onClick={() => setDraft({ ...draft, photos: draft.photos?.filter((_, currentIndex) => currentIndex !== index) })}><TrashIcon /></button></div>)}</div> : <p className="editor-photos-empty">No hay fotos añadidas.</p>}
            </div>
          )}
          <button type="submit" className="primary-button editor-save"><CheckIcon /> Guardar cambios</button>
        </form>
      </section>
    </div>
  )
}
