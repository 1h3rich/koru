import { useMemo, useState, type FormEvent } from 'react'
import { CalendarIcon, TrashIcon } from './Icons'
import MonthPicker from './MonthPicker'
import MonthlyIncomeSources from './MonthlyIncomeSources'
import { defaultMonthCycle, getBudgetMonth, moveMonth, summarizeBudgetMonth, validMonthCutoff } from './monthlyBudget'
import type { ConfirmIncomeReceipt, MonthCycle, MonthlyBudget, Transaction } from './types'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const dateLabel = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const displayDate = (date: string) => dateLabel.format(new Date(`${date}T00:00:00Z`))

interface Props {
  budget: MonthlyBudget
  today: string
  transactions: Transaction[]
  onSave: (changes: MonthlyBudget, message: string) => boolean
  onConfirm: (request: ConfirmIncomeReceipt) => boolean
  onUndo: (id: string) => boolean
}

export default function MonthsPanel({ budget, today, transactions, onSave, onConfirm, onUndo }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const cycle = budget.cycle ?? defaultMonthCycle
  const month = selected ?? getBudgetMonth(today, cycle)
  const summary = useMemo(() => summarizeBudgetMonth(transactions, month, budget, today), [transactions, month, budget, today])
  const { sources } = summary.incomeDetails

  return (
    <details className="panel months-panel">
      <summary className="transaction-manager-summary">
        <div className="transaction-manager-icon"><CalendarIcon /></div>
        <div><strong>Meses</strong><span>Ingresos y gastos por periodo</span></div>
        <span className="details-plus" aria-hidden="true">+</span>
      </summary>
      <div className="months-content">
        <div className="month-navigation">
          <button className="secondary-button" type="button" aria-label="Mes anterior" onClick={() => setSelected(moveMonth(month, -1))} disabled={month === '1900-01'}>‹</button>
          <div className="field">
            <label htmlFor="budget-month">Mes del presupuesto</label>
            <MonthPicker id="budget-month" value={month} onChange={setSelected} />
          </div>
          <button className="secondary-button" type="button" aria-label="Mes siguiente" onClick={() => setSelected(moveMonth(month, 1))} disabled={month === '9998-12'}>›</button>
        </div>
        <p className="month-period"><CalendarIcon /> {displayDate(summary.period.start)} – {displayDate(summary.period.end)}</p>
        <dl className="month-totals">
          <div><dt>Nóminas y recurrentes cobrados</dt><dd>{currency.format(summary.income)}</dd></div>
          <div><dt>Gastos registrados</dt><dd>{currency.format(summary.expenses)}</dd></div>
          <div className="month-difference"><dt>Diferencia</dt><dd className={summary.difference < 0 ? 'negative' : ''}>{currency.format(summary.difference)}</dd></div>
        </dl>
        <MonthlyIncomeSources key={month} month={month} today={today} sources={sources} transactions={transactions} receipts={summary.receipts} onSave={onSave} onConfirm={onConfirm} onUndo={onUndo} />
        {sources.length === 0 && <p className="monthly-income-note">Añade una nómina o un ingreso extra. Cuando lo cobres, podrás registrarlo o vincularlo con un movimiento existente.</p>}
        <CycleSettings cycle={cycle} showHolidays={sources.some((source) => source.payday === 'fourth-business-day')} onSave={onSave} />
      </div>
    </details>
  )
}

function CycleSettings({ cycle, showHolidays, onSave }: Pick<Props, 'onSave'> & { cycle: MonthCycle, showHolidays: boolean }) {
  const [holiday, setHoliday] = useState('')

  function saveCycle(changes: Partial<MonthCycle>) {
    return onSave({ incomes: [], cycle: { ...cycle, ...changes, updatedAt: Math.max(Date.now(), cycle.updatedAt + 1) } }, 'Ciclo mensual guardado')
  }

  function addHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!holiday || cycle.holidays.includes(holiday)) return
    if (saveCycle({ holidays: [...cycle.holidays, holiday].sort() })) setHoliday('')
  }

  return (
    <details className="month-cycle-settings">
      <summary>Corte mensual <span>{cycle.cutoff === 'day-25' ? 'Día 25' : '4.º último día hábil'}</span></summary>
      <div className="field">
        <label htmlFor="month-cutoff">El siguiente mes empieza el</label>
        <select id="month-cutoff" value={cycle.cutoff} onChange={(event) => {
          if (validMonthCutoff(event.target.value)) saveCycle({ cutoff: event.target.value })
        }}>
          <option value="day-25">Día 25</option>
          <option value="fourth-business-day">4.º último día hábil</option>
        </select>
      </div>
      <p>El día del corte ya pertenece al mes siguiente. El corte se aplica a todos los periodos del resumen.</p>
      {(cycle.cutoff === 'fourth-business-day' || showHolidays) && (
        <form className="month-holidays" onSubmit={addHoliday}>
          <p>Se cuentan los días de lunes a viernes. Añade los festivos de tu empresa para excluirlos.</p>
          <div className="field">
            <label htmlFor="month-holiday">Fecha del festivo</label>
            <input id="month-holiday" type="date" min="1900-01-01" max="9998-12-31" value={holiday} onChange={(event) => setHoliday(event.target.value)} required />
          </div>
          <button className="secondary-button" type="submit" disabled={!holiday || cycle.holidays.includes(holiday)}>Añadir festivo</button>
          {cycle.holidays.length > 0 && (
            <ul role="list" aria-label="Festivos excluidos">
              {cycle.holidays.map((date) => (
                <li key={date}>
                  <time dateTime={date}>{displayDate(date)}</time>
                  <button type="button" className="icon-button" aria-label={`Quitar festivo del ${displayDate(date)}`} onClick={() => saveCycle({ holidays: cycle.holidays.filter((item) => item !== date) })}><TrashIcon /></button>
                </li>
              ))}
            </ul>
          )}
          {holiday && cycle.holidays.includes(holiday) && <p role="status">Ese festivo ya está añadido.</p>}
        </form>
      )}
    </details>
  )
}
