import { useState, type ChangeEvent } from 'react'
import { ShieldIcon } from './Icons'
import { validFixedExpense } from './fixedExpenses'
import type { FixedExpense, Loan, ReserveMovement, Transaction } from './types'

export interface BackupData {
  version: 1
  exportedAt: string
  transactions: Transaction[]
  reserveMovements: ReserveMovement[]
  loans: Loan[]
  fixedExpenses?: FixedExpense[]
}

interface BackupPanelProps {
  transactions: Transaction[]
  reserveMovements: ReserveMovement[]
  loans: Loan[]
  fixedExpenses: FixedExpense[]
  onImport: (data: BackupData) => void
}

export default function BackupPanel({ transactions, reserveMovements, loans, fixedExpenses, onImport }: BackupPanelProps) {
  const [message, setMessage] = useState('')

  function downloadBackup() {
    const data: BackupData = { version: 1, exportedAt: new Date().toISOString(), transactions, reserveMovements, loans, fixedExpenses }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `koru-copia-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Copia descargada. Guárdala en Archivos o iCloud Drive.')
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as Partial<BackupData>
      if (data.version !== 1 || !Array.isArray(data.transactions) || !Array.isArray(data.reserveMovements) || !Array.isArray(data.loans)
        || (data.fixedExpenses !== undefined && (!Array.isArray(data.fixedExpenses) || !data.fixedExpenses.every(validFixedExpense)))) throw new Error()
      onImport(data as BackupData)
      setMessage('Copia recuperada y combinada con los datos de este dispositivo.')
    } catch {
      setMessage('Ese archivo no parece una copia válida de Koru.')
    }
  }

  return (
    <details className="backup-panel">
      <summary><ShieldIcon /><span><strong>Copia de seguridad</strong><small>Exportar o recuperar sin borrar lo actual</small></span><b>+</b></summary>
      <div>
        <p>El archivo se queda contigo y contiene tus datos financieros. Al recuperarlo, Koru combina los registros en vez de sustituirlos.</p>
        <div className="backup-actions">
          <button type="button" onClick={downloadBackup}>Descargar copia</button>
          <label htmlFor="backup-file">Recuperar copia</label>
          <input id="backup-file" type="file" accept="application/json,.json" onChange={importBackup} />
        </div>
        {message && <p className="backup-message" role="status">{message}</p>}
      </div>
    </details>
  )
}
