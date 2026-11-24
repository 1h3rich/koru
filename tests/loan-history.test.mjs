import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getPaidLoanEntries } from '../src/finance.ts'

test('Paid loan participants become independent compact history entries', () => {
  const loans = [{
    id: 'gift', person: 'Andres, Izarbe', reason: 'Seguro', amount: 64, lentDate: '2026-11-01', dueDate: '', status: 'open', createdAt: 1, updatedAt: 2,
    participants: [
      { id: 'andres', name: 'Andres', amount: 55, status: 'repaid', repaidAt: '2026-11-24' },
      { id: 'izarbe', name: 'Izarbe', amount: 9, status: 'open' },
    ],
  }]
  assert.deepEqual(getPaidLoanEntries(loans), [{
    id: 'gift-andres', loanId: 'gift', participantId: 'andres', name: 'Andres', reason: 'Seguro', amount: 55, repaidAt: '2026-11-24', updatedAt: 2,
  }])
})

test('Legacy single-person repaid loans stay visible in compact history', () => {
  const loans = [{ id: 'old', person: 'Andres', reason: 'Seguro', amount: 55, lentDate: '2026-11-01', dueDate: '', status: 'repaid', repaidAt: '2026-11-23', createdAt: 1 }]
  assert.equal(getPaidLoanEntries(loans)[0].name, 'Andres')
  assert.equal(getPaidLoanEntries(loans)[0].amount, 55)
})
