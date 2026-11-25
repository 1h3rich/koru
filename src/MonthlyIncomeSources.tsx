import { useState, type FormEvent } from 'react'
import { CheckIcon, EditIcon, PlusIcon, TrashIcon } from './Icons'
import { MAX_MONTHLY_INCOME, validMonthCutoff } from './monthlyBudget'
import { parseBudgetAmount } from './money'
import type { MonthCutoff, MonthlyBudget, MonthlyIncomeSource } from './types'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
type ScheduledIncome = MonthlyIncomeSource & { amount: number, date: string }

interface Props {
  month: string
  sources: ScheduledIncome[]
  onSave: (changes: MonthlyBudget, message: string) => boolean
}

export default function MonthlyIncomeSources({ month, sources, onSave }: Props) {
  const [editing, setEditing] = useState<ScheduledIncome | 'new' | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null)

  function remove(source: ScheduledIncome, timestamp: number) {
    if (pendingRemoval !== source.id) {
      setPendingRemoval(source.id)
      return
    }
    const { id, name, payday, updatedAt } = source
    const change: MonthlyIncomeSource = { id, month, name, payday, amount: null, updatedAt: Math.max(timestamp, updatedAt + 1) }
    if (onSave({ incomes: [], incomeSources: [change] }, 'Ingreso recurrente retirado')) {
      setPendingRemoval(null)
      setEditing(null)
    }
  }

  return (
    <section className="monthly-income-sources" aria-labelledby="monthly-sources-title">
      <div className="monthly-sources-heading">
        <strong id="monthly-sources-title">Ingresos recurrentes</strong>
        <button type="button" className="secondary-button" onClick={() => { setEditing('new'); setPendingRemoval(null) }}><PlusIcon /> Añadir ingreso</button>
      </div>
      {sources.length > 0 && (
        <ul className="monthly-sources-list" role="list">
          {sources.map((source) => (
            <li key={source.id}>
              <span><strong>{source.name}</strong><time dateTime={source.date}>{dateFormat.format(new Date(`${source.date}T00:00:00Z`))}</time></span>
              <b>{currency.format(source.amount)}</b>
              <button type="button" className="icon-button" aria-label={`Editar ${source.name}`} onClick={() => { setEditing(source); setPendingRemoval(null) }}><EditIcon /></button>
              <button type="button" className="icon-button remove-monthly-income" aria-label={pendingRemoval === source.id ? `Confirmar retirada de ${source.name}` : `Quitar ${source.name}`} onClick={() => remove(source, Date.now())}>
                {pendingRemoval === source.id ? <CheckIcon /> : <TrashIcon />}
              </button>
              {pendingRemoval === source.id && <p className="monthly-source-confirm" role="status">Pulsa de nuevo para quitarlo desde este mes.</p>}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <IncomeSourceForm
          key={editing === 'new' ? 'new' : editing.id}
          month={month}
          source={editing === 'new' ? undefined : editing}
          onSave={onSave}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function IncomeSourceForm({ month, source, onSave, onClose }: Omit<Props, 'sources'> & { source?: ScheduledIncome, onClose: () => void }) {
  const [name, setName] = useState(source?.name ?? '')
  const [amount, setAmount] = useState(source ? String(source.amount).replace('.', ',') : '')
  const [payday, setPayday] = useState<MonthCutoff>(source?.payday ?? 'day-25')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedAmount = parseBudgetAmount(amount)
    if (!name.trim() || !Number.isFinite(parsedAmount) || parsedAmount < 0.01 || parsedAmount > MAX_MONTHLY_INCOME) {
      setError('Introduce un nombre y un importe mayor que cero.')
      return
    }
    const income: MonthlyIncomeSource = {
      id: source?.id ?? crypto.randomUUID(),
      month,
      name: name.trim(),
      payday,
      amount: Math.round(parsedAmount * 100) / 100,
      updatedAt: Math.max(Date.now(), (source?.updatedAt ?? 0) + 1),
    }
    if (onSave({ incomes: [], incomeSources: [income] }, 'Ingreso recurrente guardado')) onClose()
  }

  return (
    <form className="month-income-form monthly-source-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="monthly-source-name">Nombre del ingreso</label>
        <input id="monthly-source-name" placeholder="Ej. Nómina" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
      </div>
      <div className="field">
        <label htmlFor="monthly-source-amount">Importe mensual</label>
        <div className="amount-input"><span>€</span><input id="monthly-source-amount" inputMode="text" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" required /></div>
      </div>
      <div className="field">
        <label htmlFor="monthly-source-payday">Fecha de cobro</label>
        <select id="monthly-source-payday" value={payday} onChange={(event) => {
          if (validMonthCutoff(event.target.value)) setPayday(event.target.value)
        }}>
          <option value="day-25">Día 25</option>
          <option value="fourth-business-day">4.º último día hábil</option>
        </select>
      </div>
      <p>Se repite desde el mes seleccionado. Los cobros de fin de mes van al presupuesto siguiente, incluso si se adelantan.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="month-income-actions">
        <button type="submit" className="primary-button"><CheckIcon /> Guardar ingreso</button>
        <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
      </div>
    </form>
  )
}
