import { useCallback, useEffect, useRef, useState } from 'react'
import AuthScreen from './AuthScreen'
import type { BackupData } from './BackupPanel'
import Dashboard from './Dashboard'
import { calculateBalanceAdjustment, getAvailableBalance, normalizeCryptoAsset } from './finance'
import { recordIncomeReceipt, undoIncomeReceipt } from './monthlyBudget'
import { closeSession, isSessionOpen, loadFixedExpenses, loadFutureSavingsPlan, loadLoans, loadMonthlyBudget, loadReserveMovements, loadTransactionDraftRecord, loadTransactions, saveTransactionDraftRecord, syncFromCloud, syncToCloud, type CloudSnapshot } from './storage'
import type { AppFeedback, ConfirmIncomeReceipt, FixedExpense, FutureSavingsPlan, Loan, MonthlyBudget, ReserveMovement, SyncStatus, ThemePreference, Transaction, TransactionFormDraftData, TransactionFormDraftRecord } from './types'

const THEME_KEY = 'koru.theme.v1'

function initialTheme(): ThemePreference {
  const saved = localStorage.getItem(THEME_KEY)
  const theme: ThemePreference = saved === 'light' || saved === 'dark' ? saved : 'system'
  applyTheme(theme)
  return theme
}

function applyTheme(theme: ThemePreference) {
  const resolved = theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme === 'system' ? 'light' : theme
  document.documentElement.dataset.theme = resolved
  document.documentElement.dataset.themePreference = theme
}

function localDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(isSessionOpen)
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions)
  const [reserveMovements, setReserveMovements] = useState<ReserveMovement[]>(loadReserveMovements)
  const [loans, setLoans] = useState<Loan[]>(loadLoans)
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(loadFixedExpenses)
  const [monthlyBudget, setMonthlyBudget] = useState(loadMonthlyBudget)
  const [today, setToday] = useState(localDate)
  const [futureSavings, setFutureSavings] = useState<FutureSavingsPlan | null>(loadFutureSavingsPlan)
  const [transactionDraft, setTransactionDraft] = useState<TransactionFormDraftRecord | null>(loadTransactionDraftRecord)
  const [draftSaveSequence, setDraftSaveSequence] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [feedback, setFeedback] = useState<AppFeedback | null>(null)
  const feedbackSequence = useRef(0)
  const [theme, setTheme] = useState<ThemePreference>(initialTheme)

  useEffect(() => {
    const updateDate = () => setToday(localDate())
    const timer = window.setInterval(updateDate, 60_000)
    window.addEventListener('focus', updateDate)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', updateDate)
    }
  }, [])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      setFeedback((current) => current?.id === feedback.id ? null : current)
    }, 3600)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    if (theme !== 'system') return
    const preference = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => applyTheme('system')
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [theme])

  function changeTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme)
    localStorage.setItem(THEME_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  useEffect(() => {
    if (!authenticated) return
    let active = true
    syncFromCloud()
      .then((snapshot) => {
        if (!active || !snapshot) return
        setTransactions(snapshot.transactions)
        setReserveMovements(snapshot.reserveMovements)
        setLoans(snapshot.loans ?? [])
        setFixedExpenses(snapshot.fixedExpenses ?? [])
        setMonthlyBudget(loadMonthlyBudget())
        setFutureSavings(snapshot.futureSavings ?? loadFutureSavingsPlan())
        setTransactionDraft(snapshot.transactionDraft ?? loadTransactionDraftRecord())
        setSyncStatus('synced')
      })
      .catch(() => {
        if (!active) return
        setSyncStatus('offline')
        setFeedback({ id: ++feedbackSequence.current, message: 'Sin conexión. Tus datos siguen guardados en este dispositivo.', tone: 'warning' })
      })
    return () => { active = false }
  }, [authenticated])

  useEffect(() => {
    if (!authenticated || draftSaveSequence === 0 || !transactionDraft) return
    const timer = window.setTimeout(() => {
      Promise.resolve()
        .then(() => syncToCloud(transactions, reserveMovements, loans, futureSavings, transactionDraft, fixedExpenses))
        .then(() => {
          setMonthlyBudget(loadMonthlyBudget())
          setSyncStatus('synced')
        })
        .catch(() => setSyncStatus('offline'))
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [authenticated, draftSaveSequence, fixedExpenses, futureSavings, loans, reserveMovements, transactionDraft, transactions])

  const saveTransactionDraft = useCallback((data: TransactionFormDraftData | null) => {
    const record: TransactionFormDraftRecord = data
      ? { data, updatedAt: Date.now() }
      : { cleared: true, updatedAt: Date.now() }
    try {
      saveTransactionDraftRecord(record)
      setTransactionDraft(record)
      setDraftSaveSequence((current) => current + 1)
    } catch {
      setSyncStatus('storage-error')
      setFeedback({ id: ++feedbackSequence.current, message: 'No pude guardar el borrador en este dispositivo.', tone: 'warning' })
    }
  }, [])

  function sync(nextTransactions: Transaction[], nextReserves: ReserveMovement[], nextLoans: Loan[], successMessage: string, nextPlan = futureSavings, nextFixedExpenses = fixedExpenses, budgetChanges?: MonthlyBudget) {
    const feedbackId = ++feedbackSequence.current
    let pending: Promise<void>
    try {
      pending = syncToCloud(nextTransactions, nextReserves, nextLoans, nextPlan, transactionDraft, nextFixedExpenses, budgetChanges)
    } catch {
      setSyncStatus('storage-error')
      setFeedback({ id: feedbackId, message: 'No se pudo guardar. Libera espacio o elimina fotos y vuelve a intentarlo.', tone: 'warning' })
      return false
    }
    if (budgetChanges) setMonthlyBudget(loadMonthlyBudget())
    setSyncStatus('syncing')
    setFeedback({ id: feedbackId, message: 'Guardado en este dispositivo · sincronizando…', tone: 'saving' })
    pending
      .then(() => {
        setMonthlyBudget(loadMonthlyBudget())
        setSyncStatus('synced')
        setFeedback((current) => current && current.id > feedbackId ? current : { id: feedbackId, message: successMessage, tone: 'success' })
      })
      .catch(() => {
        setSyncStatus('offline')
        setFeedback((current) => current && current.id > feedbackId ? current : { id: feedbackId, message: 'Guardado aquí. Se sincronizará cuando vuelva la conexión.', tone: 'warning' })
      })
    return true
  }

  function updateTransactions(next: Transaction[], successMessage: string) {
    if (!sync(next, reserveMovements, loans, successMessage)) return false
    setTransactions(next)
    return true
  }

  function addTransaction(transaction: Transaction) {
    return updateTransactions([transaction, ...transactions], transaction.type === 'income' ? 'Ingreso guardado y sincronizado' : 'Gasto guardado y sincronizado')
  }

  function updateTransaction(transaction: Transaction) {
    if (transaction.incomeReceipt && (transaction.type !== 'income' || transaction.date > localDate())) return false
    return updateTransactions(transactions.map((current) => current.id === transaction.id ? transaction : current), 'Movimiento actualizado y sincronizado')
  }

  function confirmIncomeReceipt(request: ConfirmIncomeReceipt) {
    const next = recordIncomeReceipt(transactions, monthlyBudget, request, localDate(), Date.now())
    return next !== null && updateTransactions(next, 'Cobro confirmado y sincronizado')
  }

  function cancelIncomeReceipt(id: string) {
    const next = undoIncomeReceipt(transactions, id, Date.now())
    return next !== null && updateTransactions(next, 'Confirmación del cobro deshecha')
  }

  function deleteTransaction(id: string) {
    updateTransactions(transactions.filter((transaction) => transaction.id !== id), 'Movimiento eliminado y cambio sincronizado')
  }

  function adjustCurrentBalance(targetBalance: number) {
    const date = localDate()
    const adjustment = calculateBalanceAdjustment(getAvailableBalance(transactions, loans, date), targetBalance)
    if (!adjustment) {
      setFeedback({ id: ++feedbackSequence.current, message: 'El saldo ya coincide. No hace falta cambiar nada.', tone: 'success' })
      return true
    }
    const now = Date.now()
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: adjustment.type,
      amount: adjustment.amount,
      category: 'Ajuste de saldo',
      date,
      description: 'Saldo anterior',
      createdAt: now,
      updatedAt: now,
      balanceAdjustment: true,
    }
    return updateTransactions([transaction, ...transactions], `Saldo ajustado a ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(targetBalance)} y sincronizado`)
  }

  function addReserveMovement(movement: ReserveMovement) {
    const nextReserves = [movement, ...reserveMovements]
    const nextTransactions = movement.action === 'transfer' && movement.fee
      ? [{
          id: `crypto-fee-${movement.id}`,
          type: 'expense' as const,
          amount: movement.fee,
          category: 'Comisiones cripto',
          date: movement.date,
          description: `${normalizeCryptoAsset(movement.cryptoSourceAsset)} → ${normalizeCryptoAsset(movement.cryptoAsset)}`,
          createdAt: movement.createdAt,
          updatedAt: movement.updatedAt ?? movement.createdAt,
          reserveMovementId: movement.id,
        }, ...transactions]
      : transactions
    setTransactions(nextTransactions)
    setReserveMovements(nextReserves)
    sync(nextTransactions, nextReserves, loans, movement.action === 'transfer' ? 'Cambio de criptomonedas guardado' : 'Reserva actualizada y sincronizada')
  }

  function deleteReserveMovement(id: string) {
    const nextReserves = reserveMovements.filter((movement) => movement.id !== id)
    const nextTransactions = transactions.filter((transaction) => transaction.reserveMovementId !== id)
    setTransactions(nextTransactions)
    setReserveMovements(nextReserves)
    sync(nextTransactions, nextReserves, loans, 'Movimiento de reserva eliminado')
  }

  function updateReserveMovement(movement: ReserveMovement) {
    const nextReserves = reserveMovements.map((current) => current.id === movement.id ? movement : current)
    const withoutLinkedFee = transactions.filter((transaction) => transaction.reserveMovementId !== movement.id)
    const previousFee = transactions.find((transaction) => transaction.reserveMovementId === movement.id)
    const nextTransactions = movement.action === 'transfer' && movement.fee
      ? [{
          id: previousFee?.id ?? `crypto-fee-${movement.id}`,
          type: 'expense' as const,
          amount: movement.fee,
          category: 'Comisiones cripto',
          date: movement.date,
          description: `${normalizeCryptoAsset(movement.cryptoSourceAsset)} → ${normalizeCryptoAsset(movement.cryptoAsset)}`,
          createdAt: previousFee?.createdAt ?? movement.createdAt,
          updatedAt: Date.now(),
          reserveMovementId: movement.id,
        }, ...withoutLinkedFee]
      : withoutLinkedFee
    setTransactions(nextTransactions)
    setReserveMovements(nextReserves)
    sync(nextTransactions, nextReserves, loans, 'Movimiento de reserva actualizado')
  }


  function saveLoan(loan: Loan) {
    const exists = loans.some((current) => current.id === loan.id)
    const nextLoans = exists
      ? loans.map((current) => current.id === loan.id ? loan : current)
      : [loan, ...loans]
    setLoans(nextLoans)
    sync(transactions, reserveMovements, nextLoans, exists ? 'Préstamo actualizado y sincronizado' : 'Préstamo guardado y sincronizado')
  }

  function deleteLoan(id: string) {
    const nextLoans = loans.filter((loan) => loan.id !== id)
    setLoans(nextLoans)
    sync(transactions, reserveMovements, nextLoans, 'Préstamo eliminado y cambio sincronizado')
  }

  function saveFixedExpense(expense: FixedExpense) {
    const exists = fixedExpenses.some((current) => current.id === expense.id)
    const nextFixedExpenses = exists
      ? fixedExpenses.map((current) => current.id === expense.id ? expense : current)
      : [expense, ...fixedExpenses]
    setFixedExpenses(nextFixedExpenses)
    sync(transactions, reserveMovements, loans, exists ? 'Gasto fijo actualizado y sincronizado' : 'Gasto fijo guardado y sincronizado', futureSavings, nextFixedExpenses)
  }

  function deleteFixedExpense(id: string) {
    const nextFixedExpenses = fixedExpenses.filter((expense) => expense.id !== id)
    setFixedExpenses(nextFixedExpenses)
    sync(transactions, reserveMovements, loans, 'Gasto fijo eliminado y cambio sincronizado', futureSavings, nextFixedExpenses)
  }

  function importBackup(data: BackupData) {
    function combine<T extends { id: string, createdAt: number, updatedAt?: number }>(current: T[], incoming: T[]): T[] {
      const merged = new Map(current.map((item) => [item.id, item]))
      for (const item of incoming) {
        const existing = merged.get(item.id)
        if (!existing || (item.updatedAt ?? item.createdAt) > (existing.updatedAt ?? existing.createdAt)) merged.set(item.id, item)
      }
      return [...merged.values()].sort((a, b) => b.createdAt - a.createdAt)
    }
    const nextTransactions = combine(transactions, data.transactions)
    const nextReserves = combine(reserveMovements, data.reserveMovements)
    const nextLoans = combine(loans, data.loans)
    const nextFixedExpenses = combine(fixedExpenses, data.fixedExpenses ?? [])
    const nextPlan = data.futureSavings && data.futureSavings.updatedAt > (futureSavings?.updatedAt ?? -1) ? data.futureSavings : futureSavings
    if (!sync(nextTransactions, nextReserves, nextLoans, 'Copia importada y sincronizada', nextPlan, nextFixedExpenses, data.monthlyBudget)) return
    setTransactions(nextTransactions)
    setReserveMovements(nextReserves)
    setLoans(nextLoans)
    setFixedExpenses(nextFixedExpenses)
    setFutureSavings(nextPlan)
  }

  function saveMonthlyBudget(changes: MonthlyBudget, message: string) {
    return sync(transactions, reserveMovements, loans, message, futureSavings, fixedExpenses, changes)
  }

  function logout() {
    closeSession()
    setAuthenticated(false)
  }

  function saveFutureSavings(plan: FutureSavingsPlan) {
    if (!sync(transactions, reserveMovements, loans, 'Objetivo de ahorro guardado y sincronizado', plan)) return false
    setFutureSavings(plan)
    return true
  }

  function authenticatedWith(snapshot: CloudSnapshot) {
    setTransactions(snapshot.transactions)
    setReserveMovements(snapshot.reserveMovements)
    setLoans(snapshot.loans ?? [])
    setFixedExpenses(snapshot.fixedExpenses ?? [])
    setMonthlyBudget(loadMonthlyBudget())
    setFutureSavings(snapshot.futureSavings ?? loadFutureSavingsPlan())
    setTransactionDraft(snapshot.transactionDraft ?? loadTransactionDraftRecord())
    setSyncStatus('synced')
    setAuthenticated(true)
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={authenticatedWith} />
  }

  return (
    <Dashboard
      transactions={transactions}
      onAdd={addTransaction}
      onConfirmIncomeReceipt={confirmIncomeReceipt}
      onCancelIncomeReceipt={cancelIncomeReceipt}
      transactionDraft={transactionDraft?.cleared ? null : transactionDraft?.data ?? null}
      onTransactionDraftChange={saveTransactionDraft}
      onDelete={deleteTransaction}
      onUpdate={updateTransaction}
      reserveMovements={reserveMovements}
      syncStatus={syncStatus}
      feedback={feedback}
      onAddReserveMovement={addReserveMovement}
      onDeleteReserveMovement={deleteReserveMovement}
      onUpdateReserveMovement={updateReserveMovement}
      loans={loans}
      fixedExpenses={fixedExpenses}
      monthlyBudget={monthlyBudget}
      onSaveMonthlyBudget={saveMonthlyBudget}
      today={today}
      futureSavings={futureSavings}
      onSaveFutureSavings={saveFutureSavings}
      onSaveLoan={saveLoan}
      onDeleteLoan={deleteLoan}
      onSaveFixedExpense={saveFixedExpense}
      onDeleteFixedExpense={deleteFixedExpense}
      onImportBackup={importBackup}
      onAdjustBalance={adjustCurrentBalance}
      onImportCsv={(incoming) => updateTransactions([...incoming, ...transactions], `${incoming.length} movimientos del CSV guardados y sincronizados`)}
      theme={theme}
      onThemeChange={changeTheme}
      onLogout={logout}
    />
  )
}
