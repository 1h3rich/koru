import { useMemo, useState, type FormEvent } from 'react'
import { CheckIcon, SavingsIcon } from './Icons'
import MonthPicker from './MonthPicker'
import { MonthlyIncomeForm } from './MonthsPanel'
import { calculateSavingsGoal, getMonthlySavingsHistory } from './futureSavings'
import { defaultMonthCycle, getBudgetMonth, getMonthlyIncomeDetails, MAX_MONTHLY_INCOME } from './monthlyBudget'
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
  onSaveMonthlyBudget: (changes: MonthlyBudget, message: string) => boolean
}

export default function FutureSavingsPanel({ transactions, fixedExpenses, monthlyBudget, today, plan, onSave, onSaveMonthlyBudget }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const month = selected ?? getBudgetMonth(today, monthlyBudget.cycle ?? defaultMonthCycle)
  const { manual, planned, total: income } = getMonthlyIncomeDetails(month, monthlyBudget)
  const history = useMemo(() => getMonthlySavingsHistory(transactions), [transactions])

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
        {planned === null ? (
          <MonthlyIncomeForm
            key={`${month}:${income}`}
            fieldId="savings-income"
            month={month}
            amount={income}
            lastUpdated={manual?.updatedAt}
            onSave={onSaveMonthlyBudget}
          />
        ) : <p className="monthly-income-note">Ingresos recurrentes de «Meses» · {currency.format(planned)}</p>}
        <SavingsGoalForm key={plan?.goalAmount ?? 'empty-goal'} plan={plan} income={income} expenses={fixedExpenses} onSave={onSave} />
        <details className="savings-method">
          <summary>Historial de ahorro</summary>
          <p>Ingresos menos gastos registrados por mes natural.</p>
          <div className="savings-history">
            {history.length === 0 ? <p>Aún no hay meses con movimientos.</p> : (
              <ul>
                {history.map((entry) => (
                  <li key={entry.month}>
                    <span><strong>{monthFormatter.format(new Date(`${entry.month}-01T12:00:00`))}</strong><small>{currency.format(entry.income)} ingresados · {currency.format(entry.expenses)} gastados</small></span>
                    <b className={entry.savings < 0 ? 'negative' : ''}>{currency.format(entry.savings)}</b>
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
  const [error, setError] = useState('')
  const parsedGoal = parseBudgetAmount(goal)
  const validGoal = Number.isFinite(parsedGoal) && parsedGoal >= 0.01 && parsedGoal <= MAX_MONTHLY_INCOME
  const { fixedTotal, free, months } = calculateSavingsGoal(income, expenses, validGoal ? parsedGoal : 0)

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validGoal) {
      setError('Introduce un objetivo mayor que cero.')
      return
    }
    onSave({
      ...(plan ?? { monthlySaving: 0, incomeOverride: null, pendingExpenses: 0 }),
      goalAmount: Math.round(parsedGoal * 100) / 100,
      updatedAt: Math.max(Date.now(), (plan?.updatedAt ?? 0) + 1),
    })
  }

  return (
    <form className="savings-goal-form" onSubmit={save}>
      <dl className="month-totals" aria-label="Margen mensual">
        <div><dt>Ingresos totales</dt><dd>{income === null ? '—' : currency.format(income)}</dd></div>
        <div><dt>Gastos fijos activos</dt><dd>{currency.format(fixedTotal)}</dd></div>
        <div className="month-difference"><dt>Dinero libre al mes</dt><dd className={free !== null && free < 0 ? 'negative' : ''}>{free === null ? '—' : currency.format(free)}</dd></div>
      </dl>
      <div className="field">
        <label htmlFor="savings-goal">Objetivo de ahorro total</label>
        <div className="amount-input"><span>€</span><input id="savings-goal" inputMode="text" placeholder="Ej. 10.000 €" value={goal} onChange={(event) => { setGoal(event.target.value); setError('') }} required /></div>
      </div>
      <div className="savings-goal-result" aria-live="polite">
        <span>Tiempo estimado</span>
        <strong>{months === null ? '—' : `${numberFormatter.format(months)} ${months === 1 ? 'mes' : 'meses'}`}</strong>
        <p>{income === null ? 'Guarda primero el ingreso total del mes.' : free !== null && free <= 0 ? 'Con estos ingresos y gastos fijos, el margen para ahorrar es de 0 €.' : 'Partiendo de 0 € y ahorrando todo el margen mensual. Los gastos variables reducirían ese margen.'}</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="primary-button"><CheckIcon /> Guardar objetivo</button>
    </form>
  )
}
