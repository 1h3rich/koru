import { useMemo, useState, type FormEvent } from 'react'
import { CheckIcon, SavingsIcon } from './Icons'
import MonthPicker from './MonthPicker'
import { calculateSavingsGoal } from './futureSavings'
import { defaultMonthCycle, getBudgetMonth, getMonthlyBudgetHistory, getMonthlyIncomeDetails, MAX_MONTHLY_INCOME } from './monthlyBudget'
import { parseBudgetAmount } from './money'
import type { FixedExpense, FutureSavingsPlan, MonthlyBudget, Transaction } from './types'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
const numberFormatter = new Intl.NumberFormat('es-ES')

interface Props {
  transactions: Transaction[]
  fixedExpenses: FixedExpense[]
  monthlyBudget: MonthlyBudget
  today: string
  plan: FutureSavingsPlan | null
  onSave: (plan: FutureSavingsPlan) => boolean
}

export default function FutureSavingsPanel({ transactions, fixedExpenses, monthlyBudget, today, plan, onSave }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const month = selected ?? getBudgetMonth(today, monthlyBudget.cycle ?? defaultMonthCycle)
  const { planned: income } = getMonthlyIncomeDetails(month, monthlyBudget)
  const history = useMemo(() => getMonthlyBudgetHistory(transactions, monthlyBudget, today), [transactions, monthlyBudget, today])

  return (
    <details id="future-savings-panel" className="panel future-savings-panel">
      <summary className="transaction-manager-summary">
        <div className="transaction-manager-icon"><SavingsIcon /></div>
        <div><strong>Ahorro a futuro</strong><span>Calcula cuándo alcanzarás tu objetivo</span></div>
        <span className="details-plus" aria-hidden="true">+</span>
      </summary>
      <div className="future-savings-content savings-goal-content">
        <div className="field">
          <label htmlFor="savings-month">Mes de referencia</label>
          <MonthPicker id="savings-month" value={month} onChange={setSelected} />
        </div>
        <SavingsGoalForm key={`${plan?.goalAmount ?? 0}:${plan?.monthlySaving ?? 0}`} plan={plan} income={income} expenses={fixedExpenses} onSave={onSave} />
        <details className="savings-method">
          <summary>Historial del presupuesto</summary>
          <p>Nóminas cobradas menos gastos registrados por periodo.</p>
          <div className="savings-history">
            {history.length === 0 ? <p>Aún no hay ingresos recurrentes ni gastos.</p> : (
              <ul>
                {history.map((entry) => (
                  <li key={entry.month}>
                    <span><strong>{monthFormatter.format(new Date(`${entry.month}-01T12:00:00`))}</strong><small>{currency.format(entry.income)} cobrados · {currency.format(entry.expenses)} gastados</small></span>
                    <b className={entry.difference < 0 ? 'negative' : ''}>{currency.format(entry.difference)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>
    </details>
  )
}

function SavingsGoalForm({ plan, income, expenses, onSave }: Pick<Props, 'plan' | 'onSave'> & { income: number | null, expenses: FixedExpense[] }) {
  const [goal, setGoal] = useState(() => plan?.goalAmount ? String(plan.goalAmount).replace('.', ',') : '')
  const [monthlySaving, setMonthlySaving] = useState(() => plan?.monthlySaving ? String(plan.monthlySaving).replace('.', ',') : '')
  const [error, setError] = useState('')
  const parsedGoal = parseBudgetAmount(goal)
  const validGoal = Number.isFinite(parsedGoal) && parsedGoal >= 0.01 && parsedGoal <= MAX_MONTHLY_INCOME
  const parsedSaving = parseBudgetAmount(monthlySaving)
  const validSaving = Number.isFinite(parsedSaving) && parsedSaving >= 0.01 && parsedSaving <= MAX_MONTHLY_INCOME
  const saving = validSaving ? Math.round(parsedSaving * 100) / 100 : 0
  const { fixedTotal, free, months } = calculateSavingsGoal(income, expenses, validGoal ? parsedGoal : 0, saving)
  const exceedsMargin = validSaving && free !== null && saving > Math.max(0, free)

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validGoal || !validSaving) {
      setError(validGoal ? 'Introduce un ahorro mensual válido, mayor que cero.' : 'Introduce un objetivo de ahorro válido, mayor que cero.')
      return
    }
    onSave({
      ...(plan ?? { incomeOverride: null, pendingExpenses: 0 }),
      goalAmount: Math.round(parsedGoal * 100) / 100,
      monthlySaving: saving,
      updatedAt: Math.max(Date.now(), (plan?.updatedAt ?? 0) + 1),
    })
  }

  return (
    <form className="savings-goal-form" onSubmit={save}>
      <dl className="month-totals" aria-label="Margen mensual">
        <div><dt>Ingresos previstos</dt><dd>{income === null ? '—' : currency.format(income)}</dd></div>
        <div><dt>Gastos fijos activos</dt><dd>{currency.format(fixedTotal)}</dd></div>
        <div className="month-difference"><dt>Libre tras gastos fijos</dt><dd className={free !== null && free < 0 ? 'negative' : ''}>{free === null ? '—' : currency.format(free)}</dd></div>
      </dl>
      <div className="field">
        <label htmlFor="savings-goal">Objetivo de ahorro total</label>
        <div className="amount-input"><span>€</span><input id="savings-goal" inputMode="text" placeholder="Ej. 10.000 €" value={goal} onChange={(event) => { setGoal(event.target.value); setError('') }} required /></div>
      </div>
      <div className="field">
        <label htmlFor="savings-monthly-amount">Ahorro mensual</label>
        <div className="amount-input"><span>€</span><input id="savings-monthly-amount" inputMode="text" placeholder="Ej. 200 €" value={monthlySaving} onChange={(event) => { setMonthlySaving(event.target.value); setError('') }} required /></div>
      </div>
      <div className="savings-goal-result" aria-live="polite">
        <span>Tiempo estimado</span>
        <strong>{months === null ? '—' : `${numberFormatter.format(months)} ${months === 1 ? 'mes' : 'meses'}`}</strong>
        {exceedsMargin ? <p>El ahorro mensual supera el margen tras los gastos fijos.</p> : months !== null && <p>Partiendo de 0 €.</p>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="primary-button"><CheckIcon /> Guardar objetivo</button>
    </form>
  )
}
