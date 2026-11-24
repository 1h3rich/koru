import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateFixedExpenseSummary, validFixedExpense } from '../src/fixedExpenses.ts'

const fixed = (id, amount, active = true) => ({ id, name: id, amount, category: 'Hogar', dueDay: 5, active, createdAt: 1 })
const row = (type, amount, date = '2026-11-02', balanceAdjustment = false) => ({ id: crypto.randomUUID(), type, amount, date, category: 'Prueba', description: '', createdAt: 1, balanceAdjustment })

test('Fixed monthly expenses show the full committed amount and remaining income', () => {
  const result = calculateFixedExpenseSummary(
    [fixed('Alquiler', 600), fixed('Internet', 40), fixed('Pausado', 100, false)],
    [row('income', 1000), row('expense', 200)],
    '2026-11',
  )
  assert.equal(result.total, 640)
  assert.equal(result.income, 1000)
  assert.equal(result.remaining, 360)
  assert.equal(result.percentage, 64)
  assert.equal(result.activeCount, 2)
})

test('Balance corrections and other months are not treated as monthly income', () => {
  const result = calculateFixedExpenseSummary(
    [fixed('Alquiler', 600)],
    [row('income', 1000), row('income', 500, '2026-11-03', true), row('income', 700, '2026-10-01')],
    '2026-11',
  )
  assert.equal(result.income, 1000)
  assert.equal(result.percentage, 60)
})

test('Fixed expense validation rejects impossible amounts and due days', () => {
  assert.equal(validFixedExpense(fixed('Seguro', 25)), true)
  assert.equal(validFixedExpense({ ...fixed('Seguro', 25), dueDay: 32 }), false)
  assert.equal(validFixedExpense({ ...fixed('Seguro', 0), amount: 0 }), false)
  assert.throws(() => calculateFixedExpenseSummary([], [], '2026-13'))
})
