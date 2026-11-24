import type { FixedExpense, Transaction } from './types'

const MAX_AMOUNT = 1_000_000_000

export function validFixedExpense(value: unknown): value is FixedExpense {
  if (!value || typeof value !== 'object') return false
  const expense = value as Partial<FixedExpense>
  return typeof expense.id === 'string' && expense.id.length > 0
    && typeof expense.name === 'string' && expense.name.trim().length > 0
    && typeof expense.category === 'string' && expense.category.trim().length > 0
    && typeof expense.amount === 'number' && Number.isFinite(expense.amount) && expense.amount > 0 && expense.amount <= MAX_AMOUNT
    && (expense.dueDay === null || (typeof expense.dueDay === 'number' && Number.isInteger(expense.dueDay) && expense.dueDay >= 1 && expense.dueDay <= 31))
    && typeof expense.active === 'boolean'
    && typeof expense.createdAt === 'number' && Number.isFinite(expense.createdAt)
    && (expense.updatedAt === undefined || (typeof expense.updatedAt === 'number' && Number.isFinite(expense.updatedAt)))
}

export function calculateFixedExpenseSummary(expenses: FixedExpense[], transactions: Transaction[], month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mes no válido')
  const cents = (value: number) => Math.round(value * 100)
  const active = expenses.filter((expense) => validFixedExpense(expense) && expense.active)
  const fixedCents = active.reduce((sum, expense) => sum + cents(expense.amount), 0)
  const incomeCents = transactions
    .filter((transaction) => transaction.type === 'income' && transaction.date.startsWith(`${month}-`) && !transaction.balanceAdjustment)
    .reduce((sum, transaction) => sum + cents(transaction.amount), 0)
  return {
    total: fixedCents / 100,
    income: incomeCents / 100,
    remaining: (incomeCents - fixedCents) / 100,
    percentage: incomeCents > 0 ? fixedCents / incomeCents * 100 : fixedCents > 0 ? 100 : 0,
    activeCount: active.length,
  }
}
