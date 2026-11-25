import type { FixedExpense, FixedExpensePayment, MonthCutoff, MonthCycle, MonthlyBudget, MonthlyIncome, MonthlyIncomeSource, Transaction } from './types'

const monthFormat = /^\d{4}-(0[1-9]|1[0-2])$/
const dateFormat = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
export const MAX_MONTHLY_INCOME = 1_000_000_000
export const defaultMonthCycle: MonthCycle = { cutoff: 'day-25', holidays: [], updatedAt: 0 }

export function validMonth(value: string) {
  return monthFormat.test(value) && value >= '1900-01' && value <= '9998-12'
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !dateFormat.test(value)) return false
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}

function validVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function validMonthlyIncome(value: unknown): value is MonthlyIncome {
  if (!value || typeof value !== 'object') return false
  const { month, amount, updatedAt } = value as Partial<MonthlyIncome>
  return typeof month === 'string' && validMonth(month) && validVersion(updatedAt)
    && (amount === null || (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && amount <= MAX_MONTHLY_INCOME))
}

export function validMonthCutoff(value: unknown): value is MonthCutoff {
  return value === 'day-25' || value === 'fourth-business-day'
}

export function validMonthCycle(value: unknown): value is MonthCycle {
  if (!value || typeof value !== 'object') return false
  const { cutoff, holidays, updatedAt } = value as Partial<MonthCycle>
  return validMonthCutoff(cutoff) && Array.isArray(holidays) && holidays.every(validDate) && validVersion(updatedAt)
}

export function validMonthlyBudget(value: unknown): value is MonthlyBudget {
  if (!value || typeof value !== 'object') return false
  const { incomes, cycle, payments, incomeSources } = value as Partial<MonthlyBudget>
  return Array.isArray(incomes) && incomes.every(validMonthlyIncome)
    && (incomeSources === undefined || (Array.isArray(incomeSources) && incomeSources.every(validMonthlyIncomeSource)))
    && (cycle === undefined || validMonthCycle(cycle))
    && (payments === undefined || (Array.isArray(payments) && payments.every(validFixedExpensePayment)))
}

function validMonthlyIncomeSource(value: unknown): value is MonthlyIncomeSource {
  if (!value || typeof value !== 'object') return false
  const source = value as Partial<MonthlyIncomeSource>
  return typeof source.id === 'string' && source.id.length > 0
    && typeof source.name === 'string' && source.name.trim().length > 0 && source.name.length <= 80
    && validMonthCutoff(source.payday) && validMonthlyIncome(source)
}

function validFixedExpensePayment(value: unknown): value is FixedExpensePayment {
  if (!value || typeof value !== 'object') return false
  const payment = value as Partial<FixedExpensePayment>
  return typeof payment.expenseId === 'string' && payment.expenseId.length > 0 && validMonthlyIncome(payment)
}

function mergeRecords<T extends { updatedAt: number }>(first: T[], second: T[], key: (record: T) => string) {
  const records = new Map<string, T>()
  for (const record of [...first, ...second]) {
    const id = key(record)
    const current = records.get(id)
    if (!current || record.updatedAt > current.updatedAt) records.set(id, record)
  }
  return [...records.values()]
}

export function mergeMonthlyBudgets(first?: MonthlyBudget, second?: MonthlyBudget): MonthlyBudget {
  const firstCycle = validMonthCycle(first?.cycle) ? first.cycle : undefined
  const secondCycle = validMonthCycle(second?.cycle) ? second.cycle : undefined
  return {
    incomes: mergeRecords(first?.incomes ?? [], second?.incomes ?? [], (income) => income.month),
    incomeSources: mergeRecords(first?.incomeSources ?? [], second?.incomeSources ?? [], (source) => `${source.month}:${source.id}`),
    cycle: secondCycle && (!firstCycle || secondCycle.updatedAt > firstCycle.updatedAt) ? secondCycle : firstCycle,
    payments: mergeRecords(first?.payments ?? [], second?.payments ?? [], (payment) => `${payment.month}:${payment.expenseId}`),
  }
}

function monthDate(month: string) {
  return new Date(`${month}-01T00:00:00Z`)
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function moveMonth(month: string, offset: number) {
  const date = monthDate(month)
  date.setUTCMonth(date.getUTCMonth() + offset)
  return dayKey(date).slice(0, 7)
}

function cutoffDate(month: string, cycle: MonthCycle) {
  if (cycle.cutoff === 'day-25') return `${month}-25`
  const date = monthDate(moveMonth(month, 1))
  const holidays = new Set(cycle.holidays)
  let weekdays = 0
  while (weekdays < 4) {
    date.setUTCDate(date.getUTCDate() - 1)
    if (!dayKey(date).startsWith(month)) return `${month}-01`
    const weekday = date.getUTCDay()
    if (weekday !== 0 && weekday !== 6 && !holidays.has(dayKey(date))) weekdays += 1
  }
  return dayKey(date)
}

export function getBudgetMonth(date: string, cycle: MonthCycle) {
  const month = date.slice(0, 7)
  return date >= cutoffDate(month, cycle) ? moveMonth(month, 1) : month
}

export function getMonthPeriod(month: string, cycle: MonthCycle) {
  const start = cutoffDate(moveMonth(month, -1), cycle)
  const endExclusive = cutoffDate(month, cycle)
  const end = new Date(`${endExclusive}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() - 1)
  return { start, end: dayKey(end), endExclusive }
}

export function getMonthlyIncomeDetails(month: string, budget: MonthlyBudget) {
  const latest = new Map<string, MonthlyIncomeSource>()
  for (const source of budget.incomeSources ?? []) {
    if (source.month > month) continue
    const previous = latest.get(source.id)
    if (!previous || source.month >= previous.month) latest.set(source.id, source)
  }
  const payMonth = moveMonth(month, -1)
  const cycle = budget.cycle ?? defaultMonthCycle
  const sources = [...latest.values()].flatMap((source) => source.amount === null ? [] : [{
    ...source,
    amount: source.amount,
    date: cutoffDate(payMonth, { ...cycle, cutoff: source.payday }),
  }]).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'es'))
  const planned = sources.length > 0 ? sources.reduce((sum, source) => sum + Math.round(source.amount * 100), 0) / 100 : null
  return { sources, planned }
}

function isBudgetExpense(transaction: Transaction) {
  return transaction.type === 'expense' && !transaction.balanceAdjustment && Number.isFinite(transaction.amount) && transaction.amount > 0
}

export function summarizeBudgetMonth(transactions: Transaction[], month: string, budget: MonthlyBudget) {
  const period = getMonthPeriod(month, budget.cycle ?? defaultMonthCycle)
  let expenseCents = 0
  for (const transaction of transactions) {
    if (isBudgetExpense(transaction) && transaction.date >= period.start && transaction.date < period.endExclusive) {
      expenseCents += Math.round(transaction.amount * 100)
    }
  }
  const incomeDetails = getMonthlyIncomeDetails(month, budget)
  const incomeCents = Math.round((incomeDetails.planned ?? 0) * 100)
  return {
    period,
    incomeDetails,
    income: incomeCents / 100,
    expenses: expenseCents / 100,
    difference: (incomeCents - expenseCents) / 100,
  }
}

export function getMonthlyBudgetHistory(transactions: Transaction[], budget: MonthlyBudget, today: string) {
  const cycle = budget.cycle ?? defaultMonthCycle
  const currentMonth = getBudgetMonth(today, cycle)
  const expensesByMonth = new Map<string, number>()
  for (const transaction of transactions) {
    if (!isBudgetExpense(transaction) || !validDate(transaction.date) || !validMonth(transaction.date.slice(0, 7))) continue
    const month = getBudgetMonth(transaction.date, cycle)
    if (month > currentMonth) continue
    expensesByMonth.set(month, (expensesByMonth.get(month) ?? 0) + Math.round(transaction.amount * 100))
  }
  const months = new Set(expensesByMonth.keys())
  const firstSourceMonth = budget.incomeSources?.reduce((first, source) => source.month < first ? source.month : first, currentMonth) ?? currentMonth
  for (let month = firstSourceMonth; month <= currentMonth; month = moveMonth(month, 1)) months.add(month)
  return [...months].sort((a, b) => b.localeCompare(a)).flatMap((month) => {
    const { planned } = getMonthlyIncomeDetails(month, budget)
    const expenseCents = expensesByMonth.get(month) ?? 0
    if (planned === null && expenseCents === 0) return []
    const incomeCents = Math.round((planned ?? 0) * 100)
    return [{ month, income: incomeCents / 100, expenses: expenseCents / 100, difference: (incomeCents - expenseCents) / 100 }]
  })
}

function activeFixedPaymentMonth(today: string, dueDay: number | null) {
  const month = today.slice(0, 7)
  return dueDay !== null && today < fixedExpenseDueDate(month, dueDay) ? moveMonth(month, -1) : month
}

function firstTrackedMonth(expense: FixedExpense) {
  const date = new Date(expense.createdAt)
  return Number.isNaN(date.getTime()) ? '' : dayKey(date).slice(0, 7)
}

export function summarizeFixedPayments(expenses: FixedExpense[], selectedMonth: string | null, today: string, budget: MonthlyBudget) {
  const payments = new Map((budget.payments ?? []).map((payment) => [`${payment.month}:${payment.expenseId}`, payment.amount]))
  const occurrences = new Map<string, { month: string, paid: number | null }>()
  let paidCents = 0
  let pendingCents = 0
  for (const expense of expenses) {
    const activeMonth = activeFixedPaymentMonth(today, expense.dueDay)
    const firstMonth = firstTrackedMonth(expense)
    const month = selectedMonth ?? (activeMonth < firstMonth ? firstMonth : activeMonth)
    const paid = payments.get(`${month}:${expense.id}`) ?? null
    occurrences.set(expense.id, { month, paid })
    if (paid !== null) paidCents += Math.round(paid * 100)
    else if (expense.active) pendingCents += Math.round(expense.amount * 100)
  }
  return { occurrences, paid: paidCents / 100, pending: pendingCents / 100, total: (paidCents + pendingCents) / 100 }
}

export function fixedExpenseDueDate(month: string, dueDay: number) {
  const lastDay = monthDate(moveMonth(month, 1))
  lastDay.setUTCDate(0)
  return `${month}-${String(Math.min(dueDay, lastDay.getUTCDate())).padStart(2, '0')}`
}

export function getFixedExpenseNotices(expenses: FixedExpense[], today: string, budget: MonthlyBudget) {
  const soon = new Date(`${today}T00:00:00Z`)
  soon.setUTCDate(soon.getUTCDate() + 7)
  const lastDate = dayKey(soon)
  const notices: { expense: FixedExpense, date: string, status: 'Vencido' | 'Hoy' | 'Próximo' }[] = []
  const paid = new Set((budget.payments ?? []).filter((payment) => payment.amount !== null).map((payment) => `${payment.month}:${payment.expenseId}`))
  for (const expense of expenses) {
    if (!expense.active || expense.dueDay === null) continue
    const currentPeriod = activeFixedPaymentMonth(today, expense.dueDay)
    const currentDate = fixedExpenseDueDate(currentPeriod, expense.dueDay)
    const nextPeriod = moveMonth(currentPeriod, 1)
    const nextDate = fixedExpenseDueDate(nextPeriod, expense.dueDay)
    if (currentPeriod >= firstTrackedMonth(expense) && !paid.has(`${currentPeriod}:${expense.id}`)) {
      notices.push({ expense, date: currentDate, status: currentDate === today ? 'Hoy' : 'Vencido' })
    }
    if (nextDate <= lastDate && !paid.has(`${nextPeriod}:${expense.id}`)) {
      notices.push({ expense, date: nextDate, status: 'Próximo' })
    }
  }
  return notices.sort((a, b) => a.date.localeCompare(b.date))
}
