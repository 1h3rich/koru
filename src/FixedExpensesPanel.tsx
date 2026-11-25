import { useMemo, useState, type FormEvent } from 'react'
import DecimalInput from './DecimalInput'
import { CheckIcon, EditIcon, PlusIcon, RepeatIcon, TrashIcon } from './Icons'
import MonthPicker from './MonthPicker'
import { defaultMonthCycle, fixedExpenseDueDate, getBudgetMonth, summarizeBudgetMonth, summarizeFixedPayments } from './monthlyBudget'
import type { FixedExpense, MonthlyBudget, Transaction } from './types'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const dateLabel = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const categories = ['Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Suscripciones', 'Ocio', 'Otros gastos']

interface Props {
  expenses: FixedExpense[]
  transactions: Transaction[]
  budget: MonthlyBudget
  today: string
  onSaveMonthlyBudget: (changes: MonthlyBudget, message: string) => boolean
  onSave: (expense: FixedExpense) => void
  onDelete: (id: string) => void
}

interface Draft {
  name: string
  amount: number
  category: string
  dueDay: string
}

const emptyDraft = (): Draft => ({ name: '', amount: 0, category: 'Vivienda', dueDay: '' })

export default function FixedExpensesPanel({ expenses, transactions, budget, today, onSaveMonthlyBudget, onSave, onDelete }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const summary = useMemo(() => summarizeFixedPayments(expenses, selectedMonth, today, budget), [expenses, selectedMonth, today, budget])
  const incomeMonth = selectedMonth ?? getBudgetMonth(today, budget.cycle ?? defaultMonthCycle)
  const income = useMemo(() => summarizeBudgetMonth(transactions, incomeMonth, budget).income, [transactions, incomeMonth, budget])
  const percentage = income > 0 ? Math.round(summary.total / income * 100) : 0
  const ordered = useMemo(() => [...expenses].sort((a, b) => Number(b.active) - Number(a.active) || (a.dueDay ?? 32) - (b.dueDay ?? 32) || a.name.localeCompare(b.name, 'es')), [expenses])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editing, setEditing] = useState<FixedExpense | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [deletePending, setDeletePending] = useState<string | null>(null)

  function startAdd() {
    setEditing(null)
    setDraft(emptyDraft())
    setError('')
    setShowForm(true)
  }

  function startEdit(expense: FixedExpense) {
    setEditing(expense)
    setDraft({ name: expense.name, amount: expense.amount, category: expense.category, dueDay: expense.dueDay ? String(expense.dueDay) : '' })
    setError('')
    setShowForm(true)
  }

  function cancelForm() {
    setEditing(null)
    setDraft(emptyDraft())
    setError('')
    setShowForm(false)
  }

  function save(event: FormEvent) {
    event.preventDefault()
    const name = draft.name.trim()
    const dueDay = draft.dueDay === '' ? null : Number(draft.dueDay)
    if (!name) return setError('Escribe el nombre del gasto fijo.')
    if (!Number.isFinite(draft.amount) || draft.amount <= 0) return setError('El importe debe ser mayor que cero.')
    if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) return setError('El día debe estar entre 1 y 31.')
    const timestamp = Date.now()
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      name,
      amount: draft.amount,
      category: draft.category,
      dueDay,
      active: editing?.active ?? true,
      createdAt: editing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    })
    cancelForm()
  }

  function confirmDelete(id: string) {
    if (deletePending !== id) {
      setDeletePending(id)
      return
    }
    onDelete(id)
    setDeletePending(null)
  }

  function togglePayment(expense: FixedExpense, month: string, paid: number | null, updatedAt: number) {
    const amount = paid === null ? Math.round(expense.amount * 100) / 100 : null
    const previous = budget.payments?.find((payment) => payment.expenseId === expense.id && payment.month === month)
    onSaveMonthlyBudget(
      { incomes: [], payments: [{ expenseId: expense.id, month, amount, updatedAt: Math.max(updatedAt, (previous?.updatedAt ?? 0) + 1) }] },
      amount === null ? 'Pago marcado como pendiente' : 'Pago marcado como pagado',
    )
  }

  return (
    <details id="fixed-expenses-panel" className="panel fixed-expenses-panel">
      <summary className="transaction-manager-summary">
        <div className="transaction-manager-icon fixed-expenses-icon"><RepeatIcon /></div>
        <div><strong>Gastos fijos</strong><span>{currency.format(summary.pending)} pendientes{selectedMonth ? ` · ${selectedMonth}` : ''}</span></div>
        <span className="details-plus" aria-hidden="true">+</span>
      </summary>

      <div className="fixed-expenses-content">
        <div className="fixed-payment-period">
          <div className="field">
            <label htmlFor="fixed-payment-month">Consultar por mes</label>
            <MonthPicker id="fixed-payment-month" value={selectedMonth ?? ''} onChange={(value) => setSelectedMonth(value || null)} allowEmpty />
          </div>
          {selectedMonth && <button className="secondary-button" type="button" onClick={() => setSelectedMonth(null)}>Ciclo actual</button>}
        </div>
        <dl className="month-totals" aria-label="Estado de gastos fijos">
          <div><dt>Pagado</dt><dd>{currency.format(summary.paid)}</dd></div>
          <div><dt>Pendiente</dt><dd>{currency.format(summary.pending)}</dd></div>
          <div className="month-difference"><dt>Total</dt><dd>{currency.format(summary.total)}</dd></div>
        </dl>
        <div className="fixed-expenses-meter">
          <div><span>Ingresos comprometidos</span><b>{income > 0 ? `${percentage}%` : '—'}</b></div>
          <div className="fixed-expenses-track"><span style={{ width: `${Math.min(100, percentage)}%` }} /></div>
          {income > 0 && <p>Libre tras los fijos: {currency.format(income - summary.total)}.</p>}
        </div>

        <div className="fixed-expenses-toolbar">
          <div><strong>{selectedMonth ? 'Pagos del mes' : 'Pagos del ciclo actual'}</strong><span>Marcar un pago solo actualiza su estado aquí.</span></div>
          {!showForm && <button type="button" className="secondary-button" onClick={startAdd}><PlusIcon /> Nuevo</button>}
        </div>

        {showForm && (
          <form className="fixed-expense-form" onSubmit={save}>
            <div className="fixed-expense-form-heading"><div><span>{editing ? 'Corregir' : 'Nuevo'}</span><strong>{editing ? editing.name : 'Gasto fijo mensual'}</strong></div><button type="button" onClick={cancelForm}>Cancelar</button></div>
            <div className="form-grid">
              <div className="field field-wide"><label htmlFor="fixed-name">Nombre</label><input id="fixed-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Alquiler" maxLength={80} required /></div>
              <div className="field"><label htmlFor="fixed-amount">Importe mensual</label><div className="amount-input"><span>€</span><DecimalInput id="fixed-amount" value={draft.amount} onValueChange={(amount) => setDraft({ ...draft, amount })} min={0.01} max={1_000_000_000} required /></div></div>
              <div className="field"><label htmlFor="fixed-category">Categoría</label><select id="fixed-category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
              <div className="field fixed-due-field"><label htmlFor="fixed-due-day">Día de cobro <span>(opcional)</span></label><input id="fixed-due-day" type="number" inputMode="numeric" min="1" max="31" value={draft.dueDay} onChange={(event) => setDraft({ ...draft, dueDay: event.target.value })} placeholder="Ej. 5" /></div>
            </div>
            {error && <p className="form-error" role="status">{error}</p>}
            <button type="submit" className="primary-button fixed-expense-save"><CheckIcon /> {editing ? 'Guardar cambios' : 'Guardar gasto fijo'}</button>
          </form>
        )}

        {ordered.length === 0 ? <div className="fixed-expenses-empty"><RepeatIcon /><p>Añade alquiler, suscripciones o cualquier pago que se repita cada mes.</p><button type="button" onClick={startAdd}>Añadir el primero</button></div> : (
          <ul className="fixed-expense-list">
            {ordered.map((expense) => {
              const { month, paid } = summary.occurrences.get(expense.id)!
              const dueDate = expense.dueDay === null ? null : fixedExpenseDueDate(month, expense.dueDay)
              return (
              <li key={expense.id} className={expense.active ? '' : 'paused'}>
                <span className="fixed-expense-date">{expense.dueDay ? <><b>{expense.dueDay}</b><small>DÍA</small></> : <><b>—</b><small>FLEX</small></>}</span>
                <span className="fixed-expense-copy"><strong>{expense.name}</strong><small>{expense.category}{expense.active ? '' : ' · Pausado'}{dueDate ? ` · ${dateLabel.format(new Date(`${dueDate}T00:00:00Z`))}` : ''}</small></span>
                <b className="fixed-expense-amount">{currency.format(paid ?? expense.amount)}</b>
                <div className="fixed-expense-actions">
                  {(expense.active || paid !== null) && <button className={paid !== null ? 'fixed-payment-paid' : 'fixed-payment-pending'} type="button" onClick={() => togglePayment(expense, month, paid, Date.now())} aria-label={paid === null ? `Marcar ${expense.name} como pagado` : `Desmarcar pago de ${expense.name}`} aria-pressed={paid !== null}><CheckIcon /> {paid === null ? 'Marcar pagado' : 'Pagado · Desmarcar'}</button>}
                  <button type="button" onClick={() => onSave({ ...expense, active: !expense.active, updatedAt: Date.now() })}>{expense.active ? 'Pausar' : 'Activar'}</button>
                  <button type="button" className="icon-button" onClick={() => startEdit(expense)} aria-label={`Editar ${expense.name}`}><EditIcon /></button>
                  <button type="button" className={`icon-button fixed-expense-delete ${deletePending === expense.id ? 'confirming' : ''}`} onClick={() => confirmDelete(expense.id)} aria-label={deletePending === expense.id ? `Confirmar eliminación de ${expense.name}` : `Eliminar ${expense.name}`}>{deletePending === expense.id ? <><CheckIcon /> Confirmar</> : <TrashIcon />}</button>
                </div>
              </li>
              )
            })}
          </ul>
        )}
      </div>
    </details>
  )
}
