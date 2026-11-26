import type { FixedExpense, FutureSavingsPlan, Transaction } from './types'

export function validFutureSavingsPlan(plan: unknown): plan is FutureSavingsPlan {
  if (!plan || typeof plan !== 'object') return false
  const value = plan as Partial<FutureSavingsPlan>
  const amount = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1_000_000_000
  return amount(value.monthlySaving) && amount(value.pendingExpenses)
    && (value.incomeOverride === null || amount(value.incomeOverride))
    && (value.goalAmount === undefined || amount(value.goalAmount))
    && typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) && value.updatedAt >= 0
}

export function calculateSavingsGoal(income: number | null, expenses: FixedExpense[], goal: number, monthlySaving: number) {
  const fixedCents = expenses.reduce((sum, expense) => expense.active ? sum + Math.round(expense.amount * 100) : sum, 0)
  const freeCents = income === null ? null : Math.round(income * 100) - fixedCents
  const goalCents = Math.round(goal * 100)
  const savingCents = Math.round(monthlySaving * 100)
  return {
    fixedTotal: fixedCents / 100,
    free: freeCents === null ? null : freeCents / 100,
    months: goalCents > 0 && savingCents > 0 ? Math.ceil(goalCents / savingCents) : null,
  }
}

export function calculateFutureSavings(transactions: Transaction[], plan: FutureSavingsPlan, month: string, now = new Date()) {
  if (!validFutureSavingsPlan(plan) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Plan de ahorro no válido')
  const cents = (value: number) => Math.round(value * 100)
  const recorded = transactions.filter((item) => item.date.startsWith(`${month}-`) && !item.balanceAdjustment && Number.isFinite(item.amount) && item.amount >= 0)
  const incomeCents = plan.incomeOverride === null
    ? recorded.filter((item) => item.type === 'income').reduce((sum, item) => sum + cents(item.amount), 0)
    : cents(plan.incomeOverride)
  const expenseCents = recorded.filter((item) => item.type === 'expense').reduce((sum, item) => sum + cents(item.amount), 0)
  const savingCents = cents(plan.monthlySaving)
  const pendingCents = cents(plan.pendingExpenses)
  const remainingCents = incomeCents - savingCents - expenseCents - pendingCents
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const daysRemaining = month < currentMonth ? 0 : month > currentMonth ? daysInMonth : daysInMonth - now.getDate() + 1
  return {
    income: incomeCents / 100,
    expenses: expenseCents / 100,
    saving: savingCents / 100,
    pending: pendingCents / 100,
    spendingLimit: Math.max(0, incomeCents - savingCents - pendingCents) / 100,
    remaining: remainingCents / 100,
    daily: daysRemaining ? Math.floor(Math.max(0, remainingCents) / daysRemaining) / 100 : 0,
    daysRemaining,
    annualTarget: savingCents * 12 / 100,
  }
}
