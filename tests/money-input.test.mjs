import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseMoneyInput } from '../src/money.ts'

test('Manual amounts accept cents with mobile and Spanish decimal separators', () => {
  assert.equal(parseMoneyInput('0,98'), 0.98)
  assert.equal(parseMoneyInput('0.98'), 0.98)
  assert.equal(parseMoneyInput("0'98"), 0.98)
  assert.equal(parseMoneyInput('0’98'), 0.98)
})

test('Manual amounts preserve zero and negative values for validation', () => {
  assert.equal(parseMoneyInput('0'), 0)
  assert.equal(parseMoneyInput('-0,98'), -0.98)
  assert.ok(Number.isNaN(parseMoneyInput('')))
  assert.ok(Number.isNaN(parseMoneyInput('texto')))
})
