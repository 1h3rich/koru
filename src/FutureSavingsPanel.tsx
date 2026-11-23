import { useState, type FormEvent } from 'react'
import DecimalInput from './DecimalInput'
import { SavingsIcon } from './Icons'
import { calculateFutureSavings } from './futureSavings'
import type { FutureSavingsPlan, Transaction } from './types'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
interface Props {
  transactions: Transaction[]
  plan: FutureSavingsPlan | null
  onSave: (plan: FutureSavingsPlan) => boolean
}

export default function FutureSavingsPanel({ transactions, plan, onSave }: Props) {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [draft, setDraft] = useState<FutureSavingsPlan>(plan ?? { monthlySaving: 0, incomeOverride: null, pendingExpenses: 0, updatedAt: 0 })
  const [message, setMessage] = useState('')
  const budget = calculateFutureSavings(transactions, draft, month)
  const savingsRate = budget.income > 0 ? Math.min(100, (budget.saving / budget.income) * 100) : 0
  const spentRate = budget.spendingLimit > 0 ? Math.min(100, (budget.expenses / budget.spendingLimit) * 100) : budget.expenses > 0 ? 100 : 0
  function save(event: FormEvent) {
    event.preventDefault()
    setMessage(onSave({ ...draft, updatedAt: Date.now() }) ? 'Plan guardado.' : 'No se pudo guardar el plan. Revisa el espacio del dispositivo.')
  }
  return <details id="future-savings-panel" className="panel future-savings-panel">
    <summary className="transaction-manager-summary">
      <div className="transaction-manager-icon"><SavingsIcon /></div>
      <div><strong>Ahorro a futuro</strong><span>Calcula cuánto puedes gastar sin tocar tu objetivo</span></div>
      <span className="details-plus" aria-hidden="true">+</span>
    </summary>
    <div className="future-savings-content">
      <form onSubmit={save}>
        <div className="form-grid">
          <div className="field"><label htmlFor="savings-month">Mes</label><input id="savings-month" type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value) }} required /></div>
          <div className="field"><label htmlFor="savings-income">Ingresos del mes</label><div className="amount-input"><span>€</span><DecimalInput min={0} max={1_000_000_000} id="savings-income" value={budget.income} onValueChange={(incomeOverride) => { if (incomeOverride >= 0 && incomeOverride <= 1_000_000_000) setDraft({ ...draft, incomeOverride }) }} required /></div><button type="button" className="savings-auto" onClick={() => setDraft({ ...draft, incomeOverride: null })}>{draft.incomeOverride === null ? 'Usando ingresos registrados' : 'Usar ingresos registrados'}</button></div>
          <div className="field"><label htmlFor="savings-target">Quiero ahorrar al mes</label><div className="amount-input"><span>€</span><DecimalInput min={0} max={1_000_000_000} id="savings-target" value={draft.monthlySaving} onValueChange={(monthlySaving) => { if (monthlySaving >= 0 && monthlySaving <= 1_000_000_000) setDraft({ ...draft, monthlySaving }) }} required /></div></div>
          <div className="field"><label htmlFor="savings-pending">Pagos pendientes</label><div className="amount-input"><span>€</span><DecimalInput min={0} max={1_000_000_000} id="savings-pending" value={draft.pendingExpenses} onValueChange={(pendingExpenses) => { if (pendingExpenses >= 0 && pendingExpenses <= 1_000_000_000) setDraft({ ...draft, pendingExpenses }) }} required /></div><small>Solo gastos aún no registrados.</small></div>
        </div>
        <div className="savings-results" aria-live="polite">
          <article className="savings-result-primary"><span>Presupuesto para gastar</span><strong>{currency.format(budget.spendingLimit)}</strong><small>Después de apartar ahorro y pagos pendientes</small></article>
          <article><span>Aún puedes gastar</span><strong className={budget.remaining < 0 ? 'negative' : ''}>{currency.format(budget.remaining)}</strong><small>{currency.format(budget.expenses)} ya gastados este mes</small></article>
          <article><span>Por día restante</span><strong>{currency.format(budget.daily)}</strong><small>{budget.daysRemaining} días, incluido hoy</small></article>
          <article><span>Ahorro en 12 meses</span><strong>{currency.format(budget.annualTarget)}</strong><small>Si mantienes el objetivo mensual</small></article>
        </div>
        <div className="savings-budget-meter">
          <div><span>Gasto del presupuesto</span><strong>{Math.round(spentRate)}%</strong></div>
          <div className="savings-budget-track" aria-label={`${Math.round(spentRate)}% del presupuesto de gasto utilizado`}><span style={{ width: `${spentRate}%` }} /></div>
          <p>Tu objetivo de ahorro equivale al <strong>{Math.round(savingsRate)}%</strong> de los ingresos de este mes.</p>
        </div>
        {budget.remaining < 0 && <p className="form-error" role="status">Te faltan {currency.format(-budget.remaining)} para cumplir este plan.</p>}
        <button type="submit" className="primary-button">Guardar plan</button>
        {message && <p role="status" className="purchase-photo-status">{message}</p>}
      </form>
      <details className="savings-method"><summary>Cómo se calcula</summary><p>Primero aparta tu objetivo de ahorro y los pagos pendientes de los ingresos. Ese resultado es tu presupuesto máximo para gastar. Después resta los gastos que ya has registrado para mostrar cuánto te queda. Es una guía de presupuesto, no el saldo de tu banco.</p><p>El porcentaje lo decides tú: las reglas como 50/30/20 son solo referencias y deben adaptarse a tu situación.</p><a href="https://clientebancario.bde.es/pcb/es/blog/propositos-financieros-de-ano-nuevo-como-empezar-el-ano-con-estabilidad-economica.html" target="_blank" rel="noreferrer">Banco de España · Planificar ahorro y gastos</a></details>
    </div>
  </details>
}
