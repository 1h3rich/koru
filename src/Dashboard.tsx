import { useMemo, useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, CameraIcon, CheckIcon, CloseIcon, CryptoIcon, EditIcon, EmptyIcon, GearIcon, ImageIcon, LogoutIcon, PeopleIcon, PlusIcon, ReceiptIcon, SavingsIcon, ShareIcon, ShieldIcon, TrashIcon, WalletIcon } from './Icons'
import type { BackupData } from './BackupPanel'
import LoansPanel from './LoansPanel'
import ReservesPanel from './ReservesPanel'
import TransactionEditor from './TransactionEditor'
import SettingsPanel from './SettingsPanel'
import TransactionForm from './TransactionForm'
import FutureSavingsPanel from './FutureSavingsPanel'
import FixedExpensesPanel from './FixedExpensesPanel'
import MonthsPanel from './MonthsPanel'
import CsvImportPanel from './CsvImportPanel'
import { getAvailableBalance, getLoanOutstanding, getReserveTotals } from './finance'
import { getPurchaseBatchSources } from './purchaseBatch'
import { getFixedExpenseNotices } from './monthlyBudget'
import type { AppFeedback, FixedExpense, FutureSavingsPlan, Loan, MonthlyBudget, ReserveMovement, SyncStatus, ThemePreference, Transaction, TransactionFormDraftData, TransactionType } from './types'

type Filter = 'all' | TransactionType

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

interface DashboardProps {
  transactions: Transaction[]
  onAdd: (transaction: Transaction) => boolean | void
  transactionDraft: TransactionFormDraftData | null
  onTransactionDraftChange: (draft: TransactionFormDraftData | null) => void
  onImportCsv: (transactions: Transaction[]) => boolean | void
  onDelete: (id: string) => void
  onUpdate: (transaction: Transaction) => boolean | void
  futureSavings: FutureSavingsPlan | null
  onSaveFutureSavings: (plan: FutureSavingsPlan) => boolean
  reserveMovements: ReserveMovement[]
  syncStatus: SyncStatus
  feedback: AppFeedback | null
  onAddReserveMovement: (movement: ReserveMovement) => void
  onDeleteReserveMovement: (id: string) => void
  onUpdateReserveMovement: (movement: ReserveMovement) => void
  loans: Loan[]
  fixedExpenses: FixedExpense[]
  monthlyBudget: MonthlyBudget
  onSaveMonthlyBudget: (changes: MonthlyBudget, message: string) => boolean
  today: string
  onSaveLoan: (loan: Loan) => void
  onDeleteLoan: (id: string) => void
  onSaveFixedExpense: (expense: FixedExpense) => void
  onDeleteFixedExpense: (id: string) => void
  onImportBackup: (data: BackupData) => void
  onAdjustBalance: (balance: number) => boolean | void
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  onLogout: () => void
}

export default function Dashboard({ transactions, onAdd, transactionDraft, onTransactionDraftChange, onImportCsv, onDelete, onUpdate, reserveMovements, syncStatus, feedback, onAddReserveMovement, onDeleteReserveMovement, onUpdateReserveMovement, loans, fixedExpenses, monthlyBudget, onSaveMonthlyBudget, today, futureSavings, onSaveFutureSavings, onSaveLoan, onDeleteLoan, onSaveFixedExpense, onDeleteFixedExpense, onImportBackup, onAdjustBalance, theme, onThemeChange, onLogout }: DashboardProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expense = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    const loaned = loans.reduce((sum, loan) => sum + getLoanOutstanding(loan), 0)
    return { income, expense, loaned, balance: getAvailableBalance(transactions, loans) }
  }, [transactions, loans])

  const visibleTransactions = useMemo(
    () => transactions
      .filter((item) => filter === 'all' || item.type === filter)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [filter, transactions],
  )

  const reserveTotals = useMemo(() => getReserveTotals(reserveMovements), [reserveMovements])
  const paymentNotices = useMemo(() => getFixedExpenseNotices(fixedExpenses, today, monthlyBudget), [fixedExpenses, today, monthlyBudget])

  const ratio = totals.income === 0 ? 0 : Math.min((totals.expense / totals.income) * 100, 100)

  function openReserves(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    const panel = document.querySelector<HTMLDetailsElement>('#reserves-panel')
    if (!panel) return
    panel.open = true
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openLoans(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    const panel = document.querySelector<HTMLDetailsElement>('#loans-panel')
    if (!panel) return
    panel.open = true
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app-page">
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="Koru, resumen">
            <span className="brand-mark">K</span>
            <span>Koru</span>
          </a>
          <div className="header-actions">
            <span className={`local-status ${syncStatus}`}><span /> {syncStatus === 'syncing' ? 'Sincronizando…' : syncStatus === 'storage-error' ? 'Sin guardar · falta espacio' : syncStatus === 'offline' ? 'Sin conexión · guardado local' : 'Sincronizado y cifrado'}</span>
            <button type="button" className="secondary-button settings-button" onClick={() => setSettingsOpen(true)} aria-label="Abrir ajustes">
              <GearIcon /> <span>Ajustes</span>
            </button>
            <button type="button" className="secondary-button logout-button" onClick={onLogout}>
              <LogoutIcon /> <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {feedback && (
        <div key={`${feedback.id}-${feedback.tone}`} className={`feedback-toast ${feedback.tone}`} role="status" aria-live="polite">
          <span className="feedback-mark" aria-hidden="true">{feedback.tone === 'success' ? <CheckIcon /> : feedback.tone === 'warning' ? '!' : <i />}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      <main id="top" className="dashboard">
        <section className="hero-summary" aria-labelledby="dashboard-title">
          <div>
            <p className="eyebrow eyebrow-blue">Resumen personal</p>
            <h1 id="dashboard-title">Tus cuentas,<br /><em>claras.</em></h1>
          </div>
          <div className="balance-block">
            <span>Balance actual</span>
            <strong className={totals.balance < 0 ? 'negative' : ''}>{currency.format(totals.balance)}</strong>
            <p>{transactions.length === 0 ? 'Añade tu primer movimiento' : `${transactions.length} ${transactions.length === 1 ? 'movimiento registrado' : 'movimientos registrados'}`}</p>
            <a className="quick-add-button" href="#add-title">
              <PlusIcon /> Apuntar movimiento
            </a>
          </div>
        </section>

        <details className="install-tip">
          <summary><ShareIcon /> Instalar Koru en el iPhone</summary>
          <p>En Safari, toca <strong>Compartir</strong> y después <strong>Añadir a pantalla de inicio</strong>. Se abrirá como una app y seguirá funcionando sin conexión.</p>
        </details>

        <section className="summary-grid has-loans" aria-label="Resumen financiero">
          <article className="overview-card available-card">
            <div className="overview-card-heading">
              <div className="overview-icon"><WalletIcon /></div>
              <span>Disponible</span>
            </div>
            <strong className={totals.balance < 0 ? 'negative' : ''}>{currency.format(totals.balance)}</strong>
            <div className="overview-breakdown">
              <span><i className="dot income-dot" /> Ingresos {currency.format(totals.income)}</span>
              <span><i className="dot expense-dot" /> Gastos {currency.format(totals.expense)}</span>
            </div>
            <div className="overview-progress-label"><span>Ingresos gastados</span><b>{Math.round(ratio)}%</b></div>
            <div className="progress-track"><span style={{ width: `${ratio}%` }} /></div>
          </article>
          <article className="overview-card reserved-card">
            <div className="overview-card-heading">
              <div className="overview-icon"><SavingsIcon /></div>
              <span>Reservado</span>
            </div>
            <strong>{currency.format(reserveTotals.total)}</strong>
            <div className="overview-breakdown reserve-breakdown">
              <span><SavingsIcon /> Ahorro {currency.format(reserveTotals.savings)}</span>
              <span><CryptoIcon /> Cripto {currency.format(reserveTotals.crypto)}</span>
            </div>
            <a href="#reserves-panel" className="overview-manage-link" onClick={openReserves}>Gestionar reservas <span aria-hidden="true">→</span></a>
          </article>
          <article className="overview-card loaned-card">
            <div className="overview-card-heading">
              <div className="overview-icon"><PeopleIcon /></div>
              <span>Prestado</span>
            </div>
            <strong>{currency.format(totals.loaned)}</strong>
            <p className="loaned-card-copy">Es tuyo, pero no está disponible hasta que te lo devuelvan.</p>
            <a href="#loans-panel" className="overview-manage-link" onClick={openLoans}>Ver préstamos <span aria-hidden="true">→</span></a>
          </article>
        </section>

        <div className="workspace-grid">
          <div className="action-stack">
            {paymentNotices.length > 0 && (
              <details className="panel fixed-payment-notices" open>
                <summary><CalendarIcon /><strong>Avisos de pagos</strong><span>{paymentNotices.length}</span></summary>
                <ul>
                  {paymentNotices.map(({ expense, date, status }) => (
                    <li key={`${expense.id}:${date}`}>
                      <span><strong>{expense.name}</strong><small>{status} · <time dateTime={date}>{dateFormatter.format(new Date(`${date}T12:00:00`))}</time></small></span>
                      <b>{currency.format(expense.amount)}</b>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <MonthsPanel budget={monthlyBudget} today={today} transactions={transactions} onSave={onSaveMonthlyBudget} />
            <TransactionForm onAdd={onAdd} savedDraft={transactionDraft} onDraftChange={onTransactionDraftChange} />
            <CsvImportPanel onImport={onImportCsv} />
            <ReservesPanel
              movements={reserveMovements}
              onAdd={onAddReserveMovement}
              onDelete={onDeleteReserveMovement}
              onUpdate={onUpdateReserveMovement}
            />
            <LoansPanel loans={loans} onSave={onSaveLoan} onDelete={onDeleteLoan} />
            <FixedExpensesPanel expenses={fixedExpenses} transactions={transactions} budget={monthlyBudget} today={today} onSaveMonthlyBudget={onSaveMonthlyBudget} onSave={onSaveFixedExpense} onDelete={onDeleteFixedExpense} />
            <FutureSavingsPanel transactions={transactions} fixedExpenses={fixedExpenses} monthlyBudget={monthlyBudget} today={today} plan={futureSavings} onSave={onSaveFutureSavings} />
          </div>

          <details className="panel history-panel">
            <summary className="history-heading">
              <div>
                <p className="eyebrow eyebrow-blue">Tu actividad</p>
                <h2 id="history-title">Movimientos</h2>
              </div>
              <span className="history-count">{transactions.length}</span>
            </summary>

            <div className="history-content">
              <div className="filter-tabs" aria-label="Filtrar movimientos">
                {(['all', 'income', 'expense'] as Filter[]).map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={filter === value ? 'active' : ''}
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                  >
                    {value === 'all' ? 'Todos' : value === 'income' ? 'Ingresos' : 'Gastos'}
                  </button>
                ))}
              </div>

              {visibleTransactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><EmptyIcon /></div>
                  <h3>{transactions.length === 0 ? 'Todavía no hay movimientos' : 'No hay resultados en este filtro'}</h3>
                  <p>{transactions.length === 0 ? 'Cuando añadas un ingreso o un gasto, aparecerá aquí.' : 'Prueba a seleccionar otro tipo de movimiento.'}</p>
                </div>
              ) : (
                <ul className="transaction-list">
                  {visibleTransactions.map((transaction) => (
                    <li key={transaction.id} className="transaction-item">
                      <div className="transaction-row">
                        <div className={`transaction-type-icon ${transaction.type}`}>
                          {transaction.receipt ? <ReceiptIcon /> : transaction.purchaseBatch ? <ImageIcon /> : transaction.photos?.length ? <CameraIcon /> : transaction.type === 'income' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                        </div>
                        <div className="transaction-copy">
                          <strong>{transaction.description || transaction.category}</strong>
                          <span>{transaction.description ? `${transaction.category} · ` : ''}{dateFormatter.format(new Date(`${transaction.date}T12:00:00`))}</span>
                        </div>
                        <span className={`transaction-amount ${transaction.type}`}>
                          {transaction.type === 'income' ? '+' : '−'}{currency.format(transaction.amount)}
                        </span>
                        <div className="transaction-actions">
                          <button
                            type="button"
                            className="icon-button edit-button"
                            onClick={() => setEditingTransaction(transaction)}
                            aria-label={`Editar ${transaction.description || transaction.category}`}
                            title="Editar movimiento"
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            className="icon-button delete-button"
                            onClick={() => onDelete(transaction.id)}
                            aria-label={`Eliminar ${transaction.description || transaction.category}`}
                            title="Eliminar movimiento"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      {transaction.receipt && (
                        <details className="receipt-detail">
                          <summary><ReceiptIcon /> Ver ticket · {transaction.receipt.items.length} {transaction.receipt.items.length === 1 ? 'producto' : 'productos'} <span>+</span></summary>
                          <div className="receipt-detail-content">
                            {transaction.receipt.imageDataUrl && <img src={transaction.receipt.imageDataUrl} alt={`Ticket de ${transaction.receipt.merchant}`} />}
                            <div className="receipt-detail-copy">
                              <div className="receipt-detail-heading"><strong>{transaction.receipt.merchant}</strong><b>{currency.format(transaction.receipt.total)}</b></div>
                              <ul>
                                {transaction.receipt.items.map((item) => <li key={item.id}><span>{item.name}</span><b>{currency.format(item.price)}</b></li>)}
                              </ul>
                            </div>
                          </div>
                        </details>
                      )}

                      {transaction.purchaseBatch && (
                        <details className="receipt-detail purchase-batch-detail">
                          <summary><ImageIcon /> Ver suma · {transaction.purchaseBatch.values.length} {transaction.purchaseBatch.values.length === 1 ? 'valor' : 'valores'} <span>+</span></summary>
                          <div className="purchase-batch-detail-content">
                            <div className="purchase-batch-sources">
                              {getPurchaseBatchSources(transaction.purchaseBatch).filter((source) => source.imageDataUrl).map((source, index) => <button type="button" className="purchase-source-photo" key={source.id} onClick={() => setViewingPhoto(source.imageDataUrl!)}><img src={source.imageDataUrl} alt={`Captura original ${index + 1}`} /><span>{index + 1}</span></button>)}
                            </div>
                            <ol>
                              {transaction.purchaseBatch.values.map((value, index) => <li key={`${index}-${value}`}><span>Valor {index + 1}</span><b>{currency.format(value)}</b></li>)}
                              <li className="purchase-batch-total"><span>Total</span><b>{currency.format(transaction.purchaseBatch.values.reduce((sum, value) => sum + value, 0))}</b></li>
                            </ol>
                          </div>
                        </details>
                      )}

                      {transaction.photos?.length ? (
                        <details className="receipt-detail purchase-photo-detail">
                          <summary><CameraIcon /> Ver fotos · {transaction.photos.length} <span>+</span></summary>
                          <div className="purchase-photo-view-grid">{transaction.photos.map((photo, index) => <button type="button" key={`${photo.slice(-18)}-${index}`} onClick={() => setViewingPhoto(photo)}><img src={photo} alt={`Foto de la compra ${index + 1}`} /><span>Foto {index + 1}</span></button>)}</div>
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </div>

        <footer className="app-footer">
          <span><ShieldIcon /> Privado por diseño</span>
          <p>Tus datos se cifran antes de sincronizarse.</p>
        </footer>
      </main>
      {editingTransaction && <TransactionEditor key={editingTransaction.id} transaction={editingTransaction} onSave={onUpdate} onClose={() => setEditingTransaction(null)} />}
      {settingsOpen && <SettingsPanel theme={theme} onThemeChange={onThemeChange} currentBalance={totals.balance} onAdjustBalance={onAdjustBalance} transactions={transactions} reserveMovements={reserveMovements} loans={loans} fixedExpenses={fixedExpenses} monthlyBudget={monthlyBudget} futureSavings={futureSavings} onImportBackup={onImportBackup} onClose={() => setSettingsOpen(false)} />}
      {viewingPhoto && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="Foto ampliada" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingPhoto(null) }}><button type="button" onClick={() => setViewingPhoto(null)} aria-label="Cerrar foto"><CloseIcon /></button><img src={viewingPhoto} alt="Foto ampliada de la compra" /></div>}
    </div>
  )
}
