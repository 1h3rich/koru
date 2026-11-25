import { useState, type FormEvent } from 'react'
import { CalendarIcon, CheckIcon, EditIcon, PlusIcon, TrashIcon } from './Icons'
import { MAX_MONTHLY_INCOME, moveMonth, validIncomePayday, validMonthCutoff } from './monthlyBudget'
import { parseBudgetAmount } from './money'
import type { ConfirmIncomeReceipt, IncomePayday, MonthlyBudget, MonthlyIncomeSource, ScheduledIncome, Transaction } from './types'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`))
const paydayOptions: { value: IncomePayday, label: string }[] = [
  { value: 'day-25', label: 'Recurrente · día 25' },
  { value: 'fourth-business-day', label: 'Recurrente · 4.º último día hábil' },
  { value: 'salary-once', label: 'Nómina · solo este mes' },
  { value: 'extra', label: 'Ingreso extra · solo este mes' },
]

interface Props {
  month: string
  today: string
  sources: ScheduledIncome[]
  transactions: Transaction[]
  receipts: Map<string, Transaction>
  onSave: (changes: MonthlyBudget, message: string) => boolean
  onConfirm: (request: ConfirmIncomeReceipt) => boolean
  onUndo: (id: string) => boolean
}

export default function MonthlyIncomeSources({ month, today, sources, transactions, receipts, onSave, onConfirm, onUndo }: Props) {
  const [editing, setEditing] = useState<ScheduledIncome | 'new' | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<ScheduledIncome | null>(null)
  const [undoing, setUndoing] = useState<string | null>(null)

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
        <strong id="monthly-sources-title">Cobros del mes</strong>
        <button type="button" className="secondary-button" onClick={() => { setEditing('new'); setPendingRemoval(null); setConfirming(null) }}><PlusIcon /> Añadir pendiente</button>
      </div>
      {sources.length > 0 && (
        <ul className="monthly-sources-list" role="list">
          {sources.map((source) => {
            const receipt = receipts.get(source.id)
            return (
            <li key={source.id}>
              <span>
                <strong>{source.name}</strong>
                {receipt ? <time dateTime={receipt.date}>{formatDate(receipt.date)}</time>
                  : source.date ? <time dateTime={source.date}>{formatDate(source.date)}</time>
                    : <small>{source.payday === 'extra' ? 'Ingreso extra' : 'Nómina de este mes'}</small>}
              </span>
              <b>{currency.format(receipt?.amount ?? source.amount)}</b>
              <button type="button" className="icon-button" aria-label={`Editar ${source.name}`} onClick={() => { setEditing(source); setPendingRemoval(null); setConfirming(null) }}><EditIcon /></button>
              {receipt ? <span /> : (
                <button type="button" className="icon-button remove-monthly-income" aria-label={pendingRemoval === source.id ? `Confirmar retirada de ${source.name}` : `Quitar ${source.name}`} onClick={() => remove(source, Date.now())}>
                  {pendingRemoval === source.id ? <CheckIcon /> : <TrashIcon />}
                </button>
              )}
              <div className="income-receipt-state">
                <small className={receipt ? 'received' : ''}>{receipt ? 'Cobrado' : 'Pendiente de cobrar'}</small>
                {receipt ? (
                  <button type="button" className="secondary-button" onClick={() => {
                    if (undoing !== receipt.id) setUndoing(receipt.id)
                    else if (onUndo(receipt.id)) setUndoing(null)
                  }}>{undoing === receipt.id ? 'Confirmar deshacer' : 'Deshacer'}</button>
                ) : (
                  <button type="button" className="secondary-button" onClick={() => { setConfirming(source); setEditing(null); setPendingRemoval(null) }} aria-label={`Marcar ${source.name} como cobrado`}><CheckIcon /> Cobrado</button>
                )}
              </div>
              {pendingRemoval === source.id && <p className="monthly-source-confirm" role="status">Pulsa de nuevo para quitarlo desde este mes.</p>}
              {undoing === receipt?.id && <p className="monthly-source-confirm" role="status">Deshacer devuelve este cobro a pendiente. Si lo vinculaste a un movimiento, ese movimiento se conserva.</p>}
            </li>
            )
          })}
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
      {confirming && (
        <IncomeReceiptForm key={confirming.id} source={confirming} month={month} today={today} transactions={transactions} onConfirm={onConfirm} onClose={() => setConfirming(null)} />
      )}
    </section>
  )
}

function IncomeSourceForm({ month, source, onSave, onClose }: Pick<Props, 'month' | 'onSave'> & { source?: ScheduledIncome, onClose: () => void }) {
  const [name, setName] = useState(source?.name ?? '')
  const [amount, setAmount] = useState(source ? String(source.amount).replace('.', ',') : '')
  const [payday, setPayday] = useState<IncomePayday>(source?.payday ?? 'day-25')
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
    if (onSave({ incomes: [], incomeSources: [income] }, 'Pendiente de cobro guardado')) onClose()
  }

  return (
    <form className="month-income-form monthly-source-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="monthly-source-name">Nombre del ingreso</label>
        <input id="monthly-source-name" placeholder="Ej. Nómina" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
      </div>
      <div className="field">
        <label htmlFor="monthly-source-amount">Importe previsto</label>
        <div className="amount-input"><span>€</span><input id="monthly-source-amount" inputMode="text" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" required /></div>
      </div>
      <div className="field">
        <label htmlFor="monthly-source-payday">Tipo de cobro</label>
        <select id="monthly-source-payday" value={payday} onChange={(event) => {
          if (validIncomePayday(event.target.value)) setPayday(event.target.value)
        }}>
          {paydayOptions.filter((option) => !source || (validMonthCutoff(source.payday) ? validMonthCutoff(option.value) : source.payday === option.value))
            .map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <p>{validMonthCutoff(payday) ? 'Se repite desde el mes seleccionado.' : 'Se aplica al mes seleccionado.'} Suma al disponible cuando lo confirmas como cobrado.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="month-income-actions">
        <button type="submit" className="primary-button"><CheckIcon /> Guardar pendiente</button>
        <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
      </div>
    </form>
  )
}

function IncomeReceiptForm({ source, month, today, transactions, onConfirm, onClose }: Pick<Props, 'month' | 'today' | 'transactions' | 'onConfirm'> & { source: ScheduledIncome, onClose: () => void }) {
  const [amount, setAmount] = useState(String(source.amount).replace('.', ','))
  const [date, setDate] = useState(today)
  const [selection, setSelection] = useState('')
  const [error, setError] = useState('')
  const firstDate = `${moveMonth(month, -1)}-01`
  const candidates = transactions.filter((item) => item.type === 'income' && !item.balanceAdjustment && !item.incomeReceipt && item.date <= today
    && (item.date >= firstDate || Math.round(item.amount * 100) === Math.round(source.amount * 100)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const matchingCandidate = candidates.some((item) => Math.round(item.amount * 100) === Math.round(source.amount * 100))
  const transactionId = selection === '-nuevo-' ? '' : selection

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (matchingCandidate && !selection) {
      setError('Elige el movimiento existente o indica que el cobro es nuevo.')
      return
    }
    const request = { sourceId: source.id, month }
    const value = parseBudgetAmount(amount)
    if (!transactionId && (!Number.isFinite(value) || value < 0.01 || value > MAX_MONTHLY_INCOME || !date || date > today)) {
      setError('Introduce el importe cobrado y una fecha de hoy o anterior.')
      return
    }
    if (onConfirm(transactionId ? { ...request, transactionId } : { ...request, amount: value, date })) onClose()
    else setError('No pude confirmar el cobro. Revisa si ya está registrado o vinculado.')
  }

  return (
    <form className="month-income-form monthly-source-form" onSubmit={submit}>
      <strong>Confirmar cobro de {source.name}</strong>
      {candidates.length > 0 && (
        <div className="field">
          <label htmlFor="receipt-existing">Si ya lo apuntaste, selecciona el movimiento</label>
          <select id="receipt-existing" value={selection} required={matchingCandidate} onChange={(event) => { setSelection(event.target.value); setError('') }}>
            <option value="">{matchingCandidate ? 'Elige cómo registrar el cobro' : 'Registrar un cobro nuevo'}</option>
            {matchingCandidate && <option value="-nuevo-">Registrar un cobro nuevo</option>}
            {candidates.map((item) => <option key={item.id} value={item.id}>{item.description || item.category} · {currency.format(item.amount)} · {item.date}</option>)}
          </select>
        </div>
      )}
      {!transactionId && (!matchingCandidate || selection) && (
        <>
          <div className="field">
            <label htmlFor="income-received-amount">Importe cobrado</label>
            <div className="amount-input"><span>€</span><input id="income-received-amount" inputMode="text" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div>
          </div>
          <div className="field">
            <label htmlFor="income-received-date">Fecha real de cobro</label>
            <div className="date-picker-shell reserve-date-picker">
              <span aria-hidden="true">{date ? formatDate(date) : 'Elegir fecha'}</span><CalendarIcon />
              <input id="income-received-date" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
          </div>
        </>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="month-income-actions">
        <button type="submit" className="primary-button" disabled={matchingCandidate && !selection}><CheckIcon /> {transactionId ? 'Vincular cobro' : 'Confirmar cobro'}</button>
        <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
      </div>
    </form>
  )
}
