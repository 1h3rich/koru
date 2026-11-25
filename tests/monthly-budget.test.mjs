import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getAvailableBalance } from '../src/finance.ts'
import {
  defaultMonthCycle, entriesInBudgetPeriod, fixedExpenseDueDate, getBudgetMonth, getFixedExpenseNotices, getMonthlyBudgetHistory, getMonthlyIncomeDetails,
  getMonthPeriod, mergeMonthlyBudgets, recordIncomeReceipt, summarizeBudgetMonth, summarizeFixedPayments, undoIncomeReceipt, validMonthlyBudget,
} from '../src/monthlyBudget.ts'

const gym = { id: 'gym', name: 'Gimnasio', amount: 25.99, active: true, dueDay: 4, createdAt: Date.UTC(2026, 9, 1) }
const initialBudget = { incomes: [], payments: [{ expenseId: gym.id, month: '2026-11', amount: 25.99, updatedAt: 1 }] }

test('Pay received on the 25th goes into the next month across year boundaries', () => {
  assert.equal(getBudgetMonth('2026-11-24', defaultMonthCycle), '2026-11')
  assert.equal(getBudgetMonth('2026-11-25', defaultMonthCycle), '2026-12')
  assert.equal(getBudgetMonth('2026-12-25', defaultMonthCycle), '2027-01')
  assert.deepEqual(getMonthPeriod('2026-12', defaultMonthCycle), { start: '2026-11-25', end: '2026-12-24', endExclusive: '2026-12-25' })
})

test('Fourth working day from month end skips weekends and configured holidays', () => {
  const cycle = { cutoff: 'fourth-business-day', holidays: [], updatedAt: 1 }
  assert.equal(getMonthPeriod('2026-12', cycle).endExclusive, '2026-12-28')
  const withHoliday = { ...cycle, holidays: ['2026-12-31'] }
  assert.equal(getMonthPeriod('2026-12', withHoliday).endExclusive, '2026-12-25')
  assert.equal(getBudgetMonth('2026-12-25', withHoliday), '2027-01')
})

test('One-off income contributes to available balance and never to monthly income', () => {
  const transactions = [
    { type: 'income', amount: 500, date: '2026-11-25' },
    { type: 'expense', amount: 70, date: '2026-12-24' },
    { type: 'expense', amount: 40, date: '2026-12-25' },
    { type: 'expense', amount: 45, date: '2026-12-12', balanceAdjustment: true },
  ]
  const budget = { incomes: [{ month: '2026-12', amount: 750.10, updatedAt: 1 }] }
  const summary = summarizeBudgetMonth(transactions, '2026-12', budget, '2026-12-25')
  assert.equal(summary.income, 0)
  assert.equal(summary.expenses, 70)
  assert.equal(summary.difference, -70)
  assert.equal(getAvailableBalance(transactions, []), 345)
})

test('A dated payment resets on its own due day and keeps its prior paid history', () => {
  const before = summarizeFixedPayments([gym], null, '2026-12-03', initialBudget)
  assert.equal(before.paid, 25.99)
  assert.equal(before.pending, 0)
  const after = summarizeFixedPayments([gym], null, '2026-12-04', initialBudget)
  assert.equal(after.paid, 0)
  assert.equal(after.pending, 25.99)
  assert.equal(summarizeFixedPayments([gym], '2026-11', '2026-12-04', initialBudget).paid, 25.99)
  assert.equal(fixedExpenseDueDate('2028-02', 31), '2028-02-29')
  assert.equal(fixedExpenseDueDate('2027-02', 31), '2027-02-28')
})

test('The next payment warns seven days ahead even when the previous one was paid', () => {
  assert.deepEqual(getFixedExpenseNotices([gym], '2026-11-26', initialBudget), [])
  assert.deepEqual(getFixedExpenseNotices([gym], '2026-11-27', initialBudget).map(({ date, status }) => [date, status]), [['2026-12-04', 'Próximo']])
  assert.equal(getFixedExpenseNotices([gym], '2026-12-04', initialBudget)[0].status, 'Hoy')
  assert.equal(getFixedExpenseNotices([gym], '2026-12-05', initialBudget)[0].status, 'Vencido')
  assert.deepEqual(getFixedExpenseNotices([{ ...gym, active: false }], '2026-12-04', initialBudget), [])
  assert.deepEqual(getFixedExpenseNotices([{ ...gym, dueDay: null }], '2026-12-04', initialBudget), [])
})

test('Sync combines separate months and the newest payment state wins even when removed', () => {
  const second = { incomes: [{ month: '2026-12', amount: 500, updatedAt: 2 }], payments: [{ expenseId: gym.id, month: '2026-11', amount: null, updatedAt: 2 }] }
  const merged = mergeMonthlyBudgets(initialBudget, second)
  assert.equal(merged.incomes[0].amount, 500)
  assert.equal(merged.payments[0].amount, null)
  assert.equal(mergeMonthlyBudgets(merged, initialBudget).payments[0].amount, null)
  assert.equal(mergeMonthlyBudgets(merged, { incomes: [{ month: '2026-11', amount: 700, updatedAt: 1 }] }).incomes.length, 2)
})

const payday25 = { id: 'a', name: 'Cobro del 25', month: '2026-12', payday: 'day-25', amount: 500.10, updatedAt: 1 }
const lastWeek = { id: 'b', name: 'Nómina', month: '2026-12', payday: 'fourth-business-day', amount: 700.20, updatedAt: 2 }

test('Both recurring incomes go into the selected budget even when one payday precedes the 25th', () => {
  const budget = { incomes: [{ month: '2026-12', amount: 1000, updatedAt: 1 }], cycle: { ...defaultMonthCycle, holidays: ['2026-11-30'] }, incomeSources: [payday25, lastWeek] }
  assert.ok(validMonthlyBudget(budget))
  const details = getMonthlyIncomeDetails('2026-12', budget)
  assert.equal(details.planned, 1200.30)
  assert.deepEqual(details.sources.map(({ date }) => date), ['2026-11-24', '2026-11-25'])
  const summary = summarizeBudgetMonth([{ type: 'income', amount: 500.10, date: '2026-11-25' }], '2026-12', budget, '2026-11-25')
  assert.equal(summary.income, 0)
  assert.equal(summary.period.start, '2026-11-25')
  assert.equal(getMonthlyIncomeDetails('2026-11', budget).planned, null)
  assert.equal(getMonthlyIncomeDetails('2027-01', budget).planned, 1200.30)
})

test('Recurring income edits and withdrawals apply from their effective month and keep prior totals', () => {
  const original = { incomes: [], incomeSources: [payday25, lastWeek] }
  const edits = { incomes: [], incomeSources: [
    { ...payday25, month: '2027-01', amount: 550, updatedAt: 3 },
    { ...lastWeek, month: '2027-01', amount: null, updatedAt: 4 },
  ] }
  const synced = mergeMonthlyBudgets(original, edits)
  assert.equal(getMonthlyIncomeDetails('2026-12', synced).planned, 1200.30)
  assert.equal(getMonthlyIncomeDetails('2027-01', synced).planned, 550)
  assert.equal(getMonthlyIncomeDetails('2027-02', synced).planned, 550)
})

test('Budget history uses the cutoff, recurring incomes and recorded expenses', () => {
  const budget = { incomes: [], incomeSources: [{ ...payday25, amount: 1000 }] }
  const transactions = [
    { type: 'income', amount: 500, date: '2026-11-25' },
    { type: 'income', amount: 1000, date: '2026-11-24', incomeReceipt: { sourceId: payday25.id, month: '2026-12', kind: 'payroll' } },
    { type: 'income', amount: 1000, date: '2026-12-25', incomeReceipt: { sourceId: payday25.id, month: '2027-01', kind: 'payroll' } },
    { type: 'expense', amount: 800, date: '2026-11-25' },
    { type: 'expense', amount: 1030, date: '2026-12-25' },
    { type: 'expense', amount: 500, date: '2026-12-26', balanceAdjustment: true },
    { type: 'income', amount: 150, date: '2027-01-02' },
  ]
  assert.deepEqual(getMonthlyBudgetHistory(transactions, budget, '2027-01-05'), [
    { month: '2027-01', income: 1000, expenses: 1030, difference: -30 },
    { month: '2026-12', income: 1000, expenses: 800, difference: 200 },
  ])
})

test('The 25th resets the period totals and carries forward the available balance', () => {
  const previous = { type: 'income', amount: 700, date: '2026-11-24' }
  const previousExpense = { type: 'expense', amount: 100, date: '2026-11-20' }
  const future = { type: 'income', amount: 800, date: '2026-11-26' }
  const adjustment = { type: 'income', amount: 70.38, date: '2026-11-23', balanceAdjustment: true }
  const entries = [previous, previousExpense, future, adjustment]
  const loans = [{ id: 'existing-loan', amount: 50, status: 'open', lentDate: '2026-11-23' }]
  const select = (month, today) => entriesInBudgetPeriod(entries, month, defaultMonthCycle, today, (item) => item.date)
  assert.equal(getAvailableBalance(entries, loans, '2026-11-24'), 620.38)
  assert.equal(getAvailableBalance(entries, loans, '2026-11-25'), 620.38)
  assert.deepEqual(select('2026-12', '2026-11-25'), [])
  assert.deepEqual(select('2026-11', '2026-11-25'), [previous, previousExpense, adjustment])
  assert.deepEqual(select('2026-12', '2026-11-26'), [future])
  const addedInCurrentCycle = [
    { type: 'income', amount: 238.09, date: '2026-11-25' },
    { type: 'income', amount: 238.09, date: '2026-11-25' },
    { type: 'expense', amount: 10, date: '2026-11-25' },
  ]
  assert.equal(getAvailableBalance([...entries, ...addedInCurrentCycle], loans, '2026-11-25'), 1086.56)
})

const extra = { ...payday25, id: 'extra', name: 'Ingreso extra', payday: 'extra', amount: 238.09 }
const payroll = { ...payday25, name: 'Nómina', amount: 238.09 }
const receiptBudget = { incomes: [], incomeSources: [payroll, extra] }
const month = '2026-12'
const today = '2026-11-25'

test('Two planned amounts of 238.09 are pending until each receipt is confirmed', () => {
  const expense = { id: 'expense', type: 'expense', amount: 10, date: today, createdAt: 1 }
  assert.equal(getMonthlyIncomeDetails(month, receiptBudget).planned, 238.09)
  assert.equal(getMonthlyIncomeDetails('2027-01', receiptBudget).sources.length, 1)
  assert.equal(summarizeBudgetMonth([expense], month, receiptBudget, today).difference, -10)
  assert.equal(recordIncomeReceipt([], receiptBudget, { sourceId: payroll.id, month, amount: 238.09, date: '2026-11-26' }, today, 10), null)
  const received = recordIncomeReceipt([expense], receiptBudget, { sourceId: payroll.id, month, amount: 238.09, date: today }, today, 11)
  const both = recordIncomeReceipt(received, receiptBudget, { sourceId: extra.id, month, amount: 238.09, date: today }, today, 12)
  assert.equal(getAvailableBalance(both, []), 466.18)
  assert.equal(summarizeBudgetMonth(both, month, receiptBudget, today).income, 238.09)
  assert.equal(summarizeBudgetMonth(both, month, receiptBudget, today).difference, 228.09)
  assert.equal(recordIncomeReceipt(both, receiptBudget, { sourceId: extra.id, month, amount: 238.09, date: today }, today, 13), null)
  assert.equal(getAvailableBalance(undoIncomeReceipt(both, both[0].id, 14), []), 228.09)
})

test('Linking two movements with the same amount preserves the balance and distinguishes salary from extra', () => {
  const salaryMovement = { id: 'salary-bank', type: 'income', amount: 238.09, date: today, createdAt: 1 }
  const extraMovement = { ...salaryMovement, id: 'extra-bank' }
  const existing = [salaryMovement, extraMovement]
  const linked = recordIncomeReceipt(existing, receiptBudget, { sourceId: payroll.id, month, transactionId: salaryMovement.id }, today, 20)
  assert.equal(recordIncomeReceipt(linked, receiptBudget, { sourceId: extra.id, month, transactionId: salaryMovement.id }, today, 21), null)
  const both = recordIncomeReceipt(linked, receiptBudget, { sourceId: extra.id, month, transactionId: extraMovement.id }, today, 22)
  assert.equal(getAvailableBalance(both, []), getAvailableBalance(existing, []))
  assert.equal(summarizeBudgetMonth(both, month, receiptBudget, today).income, 238.09)
  assert.equal(getAvailableBalance(undoIncomeReceipt(both, salaryMovement.id, 23), []), 476.18)
})
