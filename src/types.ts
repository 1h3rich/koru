export type TransactionType = 'income' | 'expense'
export type SyncStatus = 'syncing' | 'synced' | 'offline' | 'storage-error'
export type ThemePreference = 'system' | 'light' | 'dark'
export type FeedbackTone = 'saving' | 'success' | 'warning'

export interface AppFeedback {
  id: number
  message: string
  tone: FeedbackTone
}

export interface ReceiptItem {
  id: string
  name: string
  price: number
}

export interface ReceiptDetails {
  merchant: string
  total: number
  items: ReceiptItem[]
  imageDataUrl?: string
}

export interface PurchaseBatch {
  values: number[]
  imageDataUrl?: string
  imageDataUrls?: string[]
  sources?: PurchaseBatchSource[]
}

export interface PurchaseBatchSource {
  id: string
  imageDataUrl?: string
  values: number[]
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  date: string
  description: string
  createdAt: number
  updatedAt?: number
  balanceAdjustment?: boolean
  reserveMovementId?: string
  receipt?: ReceiptDetails
  photos?: string[]
  purchaseBatch?: PurchaseBatch
}

export interface TransactionDraft {
  type: TransactionType
  amount: string
  category: string
  date: string
  description: string
}

export interface TransactionFormDraftData {
  draft: TransactionDraft
  receipt: ReceiptDetails | null
  purchaseBatch: PurchaseBatch | null
}

export interface TransactionFormDraftRecord {
  data?: TransactionFormDraftData
  cleared?: boolean
  updatedAt: number
}

export interface FutureSavingsPlan {
  monthlySaving: number
  incomeOverride: number | null
  pendingExpenses: number
  goalAmount?: number
  updatedAt: number
}

export type MonthCutoff = 'day-25' | 'fourth-business-day'

export interface MonthlyIncome {
  month: string
  amount: number | null
  updatedAt: number
}

export interface MonthCycle {
  cutoff: MonthCutoff
  holidays: string[]
  updatedAt: number
}

export interface FixedExpensePayment {
  expenseId: string
  month: string
  amount: number | null
  updatedAt: number
}

export interface MonthlyBudget {
  incomes: MonthlyIncome[]
  cycle?: MonthCycle
  payments?: FixedExpensePayment[]
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  category: string
  dueDay: number | null
  active: boolean
  createdAt: number
  updatedAt?: number
}

export type LoanStatus = 'open' | 'repaid'

export interface LoanParticipant {
  id: string
  name: string
  amount: number
  status: LoanStatus
  repaidAt?: string
}

export interface Loan {
  id: string
  person: string
  reason: string
  amount: number
  lentDate: string
  dueDate: string
  status: LoanStatus
  repaidAt?: string
  participants?: LoanParticipant[]
  createdAt: number
  updatedAt?: number
}

export type ReserveType = 'savings' | 'crypto'
export type ReserveAction = 'deposit' | 'withdraw' | 'transfer'

export interface ReserveMovement {
  id: string
  reserve: ReserveType
  action: ReserveAction
  amount: number
  cryptoAsset?: string
  cryptoSourceAsset?: string
  fee?: number
  description: string
  date: string
  createdAt: number
  updatedAt?: number
}
