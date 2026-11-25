import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseBudgetAmount, parseMoneyInput } from '../src/money.ts'

test('Manual amounts accept cents with mobile and Spanish decimal separators', () => {
  assert.equal(parseMoneyInput('0,98'), 0.98)
  assert.equal(parseMoneyInput('0.98'), 0.98)
  assert.equal(parseMoneyInput("0'98"), 0.98)
  assert.equal(parseMoneyInput('0’98'), 0.98)
})

test('Budget fields accept Spanish thousands and money pasted from another screen', () => {
  assert.equal(parseBudgetAmount('10.000 €'), 10_000)
  assert.equal(parseBudgetAmount('1.234,56 €'), 1234.56)
  assert.equal(parseBudgetAmount('0.98'), 0.98)
})

test('Manual amounts preserve zero and negative values for validation', () => {
  assert.equal(parseMoneyInput('0'), 0)
  assert.equal(parseMoneyInput('-0,98'), -0.98)
  assert.ok(Number.isNaN(parseMoneyInput('')))
  assert.ok(Number.isNaN(parseMoneyInput('texto')))
})
