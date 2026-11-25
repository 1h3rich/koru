import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateFutureSavings, calculateSavingsGoal, validFutureSavingsPlan } from '../src/futureSavings.ts'

const plan = { monthlySaving: 300, incomeOverride: null, pendingExpenses: 100, updatedAt: 1 }
const row = (type, amount, date = '2026-11-02') => ({ id: crypto.randomUUID(), type, amount, date, category: 'Prueba', description: '', createdAt: 1 })

test('Monthly spending subtracts the saving target, recorded expenses and pending payments once', () => {
  const result = calculateFutureSavings([row('income', 2000), row('expense', 500), row('income', 999, '2026-10-01')], plan, '2026-11', new Date(2026, 10, 21))
  assert.equal(result.remaining, 1100)
  assert.equal(result.spendingLimit, 1600)
  assert.equal(result.daily, 110)
  assert.equal(result.daysRemaining, 10)
  assert.equal(result.annualTarget, 3600)
})

test('Forecast income replaces recorded income instead of counting it twice', () => {
  const result = calculateFutureSavings([row('income', 2000)], { ...plan, incomeOverride: 2500 }, '2026-11')
  assert.equal(result.income, 2500)
  assert.equal(result.remaining, 2100)
})

test('A balance adjustment is not treated as monthly income', () => {
  const adjustment = { ...row('income', 3000), balanceAdjustment: true }
  const result = calculateFutureSavings([adjustment, row('income', 1000), row('expense', 200)], { ...plan, monthlySaving: 100, pendingExpenses: 0 }, '2026-11')
  assert.equal(result.income, 1000)
  assert.equal(result.remaining, 700)
})

test('A deficit stays negative, while the daily spending allowance is zero', () => {
  const result = calculateFutureSavings([row('income', 200)], plan, '2026-11')
  assert.equal(result.remaining, -200)
  assert.equal(result.daily, 0)
})

test('Cents are added as integers and daily amounts round down', () => {
  const result = calculateFutureSavings([row('income', 0.1), row('income', 0.2)], { ...plan, monthlySaving: 0, pendingExpenses: 0 }, '2026-11', new Date(2026, 10, 2))
  assert.equal(result.remaining, 0.3)
  assert.equal(result.daily, 0.01)
})

test('Calendar handles leap months, past months and future months', () => {
  assert.equal(calculateFutureSavings([], plan, '2028-02', new Date(2028, 1, 29)).daysRemaining, 1)
  assert.equal(calculateFutureSavings([], plan, '2028-02', new Date(2028, 0, 1)).daysRemaining, 29)
  assert.equal(calculateFutureSavings([], plan, '2028-02', new Date(2028, 2, 1)).daysRemaining, 0)
  assert.throws(() => calculateFutureSavings([], { ...plan, monthlySaving: -1 }, '2026-11'))
  assert.throws(() => calculateFutureSavings([], plan, '2026-13'))
})

test('A savings goal uses the planned income and active fixed expenses, rounding up to a full month', () => {
  const expenses = [{ amount: 700, active: true }, { amount: 200, active: false }]
  assert.deepEqual(calculateSavingsGoal(1500, expenses, 10_000), { fixedTotal: 700, free: 800, months: 13 })
  assert.equal(calculateSavingsGoal(500, expenses, 10_000).months, null)
  assert.equal(calculateSavingsGoal(0, expenses, 10_000).free, -700)
  assert.equal(calculateSavingsGoal(null, expenses, 10_000).free, null)
  assert.ok(validFutureSavingsPlan({ ...plan, goalAmount: 10000 }))
})
