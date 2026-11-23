import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { CheckIcon, PlusIcon, TrashIcon } from './Icons'
import { CSV_TEMPLATE, parseTransactionsCsv } from './csvImport'
import type { Transaction } from './types'

const CSV_DRAFT_KEY = 'koru.csv-draft.v1'
const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

interface CsvImportPanelProps {
  onImport: (transactions: Transaction[]) => boolean | void
}

function initialCsvDraft(): string {
  try { return localStorage.getItem(CSV_DRAFT_KEY) ?? '' } catch { return '' }
}

export default function CsvImportPanel({ onImport }: CsvImportPanelProps) {
  const [text, setText] = useState(initialCsvDraft)
  const [notice, setNotice] = useState('')
  const result = useMemo(() => parseTransactionsCsv(text), [text])

  useEffect(() => {
    try {
      if (text) localStorage.setItem(CSV_DRAFT_KEY, text)
      else localStorage.removeItem(CSV_DRAFT_KEY)
    } catch {
      window.setTimeout(() => setNotice('No pude guardar el borrador CSV en este dispositivo.'), 0)
    }
  }, [text])

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 1_000_000) {
      setNotice('El CSV debe ocupar menos de 1 MB.')
      return
    }
    setText(await file.text())
    setNotice('CSV cargado. Revisa las filas antes de importarlas.')
  }

  function importRows() {
    if (!result.transactions.length) return
    if (onImport(result.transactions) === false) {
      setNotice('No se pudieron guardar los movimientos. El borrador CSV sigue aquí.')
      return
    }
    setNotice(`${result.transactions.length} movimientos importados correctamente.`)
    setText('')
  }

  return (
    <details className="panel csv-panel">
      <summary className="transaction-manager-summary">
        <div className="transaction-manager-icon csv-icon">CSV</div>
        <div><strong>Importar CSV</strong><span>Pega o sube hasta 1.000 movimientos</span></div>
        <span className="details-plus" aria-hidden="true">+</span>
      </summary>
      <div className="csv-panel-content">
        <div className="csv-help">
          <strong>Columnas: tipo, importe, categoría, fecha y descripción</strong>
          <span>Usa punto y coma para poder escribir importes con coma. La fecha puede ser AAAA-MM-DD o DD/MM/AAAA.</span>
        </div>
        <div className="csv-actions">
          <label className="receipt-upload-button" htmlFor="csv-upload"><PlusIcon /> Subir CSV</label>
          <input id="csv-upload" className="receipt-file-input" type="file" accept=".csv,text/csv" onChange={readFile} />
          <button type="button" className="secondary-button" onClick={() => setText(CSV_TEMPLATE)}>Usar plantilla</button>
          {text && <button type="button" className="discard-content-button" onClick={() => { setText(''); setNotice('Borrador CSV borrado.') }}><TrashIcon /> Borrar datos</button>}
        </div>
        <label className="csv-text-label" htmlFor="csv-text">Pegar CSV</label>
        <textarea id="csv-text" value={text} onChange={(event) => setText(event.target.value)} placeholder={CSV_TEMPLATE} spellCheck={false} />
        {text && <p className="csv-draft-note">Borrador CSV guardado en este dispositivo · el archivo original no se conserva.</p>}
        {result.errors.length > 0 && <div className="csv-errors" role="alert"><strong>{result.errors.length} filas necesitan revisión</strong>{result.errors.slice(0, 4).map((error) => <span key={error}>{error}</span>)}</div>}
        {result.transactions.length > 0 && (
          <div className="csv-preview">
            <div className="csv-preview-heading"><strong>{result.transactions.length} movimientos preparados</strong><span>Vista previa de los primeros 5</span></div>
            <div className="csv-preview-rows">{result.transactions.slice(0, 5).map((transaction) => <div key={transaction.id}><span>{transaction.description || transaction.category}</span><b className={transaction.type}>{transaction.type === 'income' ? '+' : '−'}{currency.format(transaction.amount)}</b></div>)}</div>
            <button type="button" className="primary-button csv-import-button" onClick={importRows}><CheckIcon /> Importar {result.transactions.length} movimientos</button>
          </div>
        )}
        {notice && <p className="purchase-photo-status" role="status">{notice}</p>}
      </div>
    </details>
  )
}
