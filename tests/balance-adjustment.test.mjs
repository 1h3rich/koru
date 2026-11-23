import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateBalanceAdjustment, getAvailableBalance } from '../src/finance.ts'

const transaction = (type, amount) => ({ id: crypto.randomUUID(), type, amount, category: 'Prueba', date: '2026-11-23', description: '', createdAt: 1 })

test('Available balance includes income, expenses and outstanding loans once', () => {
  const loans = [{ id: 'loan', person: 'A', reason: '', amount: 75.25, lentDate: '2026-11-01', dueDate: '', status: 'open', createdAt: 1 }]
  assert.equal(getAvailableBalance([transaction('income', 1000.1), transaction('expense', 200.2)], loans), 724.65)
})

test('Balance adjustment adds only the difference needed to reach the bank balance', () => {
  assert.deepEqual(calculateBalanceAdjustment(-500, 310.91), { type: 'income', amount: 810.91 })
  assert.deepEqual(calculateBalanceAdjustment(500, 310.91), { type: 'expense', amount: 189.09 })
  assert.equal(calculateBalanceAdjustment(310.91, 310.91), null)
})

test('Balance adjustment rounds cents predictably and rejects invalid values', () => {
  assert.deepEqual(calculateBalanceAdjustment(0.1 + 0.2, 1), { type: 'income', amount: 0.7 })
  assert.throws(() => calculateBalanceAdjustment(0, Number.NaN))
})
