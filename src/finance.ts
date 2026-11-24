import type { Loan, LoanParticipant, ReserveMovement, ReserveType, Transaction, TransactionType } from './types'

export const DEFAULT_CRYPTO_ASSET = 'USDT'

export function getLoanParticipants(loan: Loan): LoanParticipant[] {
  if (loan.participants?.length) return loan.participants
  return [{
    id: `${loan.id}-person`,
    name: loan.person,
    amount: loan.amount,
    status: loan.status,
    repaidAt: loan.repaidAt,
  }]
}

export function getLoanOutstanding(loan: Loan): number {
  return getLoanParticipants(loan)
    .filter((participant) => participant.status === 'open')
    .reduce((sum, participant) => sum + participant.amount, 0)
}

export interface PaidLoanEntry {
  id: string
  loanId: string
  participantId: string
  name: string
  reason: string
  amount: number
  repaidAt: string
  updatedAt: number
}

export function getPaidLoanEntries(loans: Loan[]): PaidLoanEntry[] {
  return loans
    .flatMap((loan) => getLoanParticipants(loan)
      .filter((participant) => participant.status === 'repaid')
      .map((participant) => ({
        id: `${loan.id}-${participant.id}`,
        loanId: loan.id,
        participantId: participant.id,
        name: participant.name,
        reason: loan.reason,
        amount: participant.amount,
        repaidAt: participant.repaidAt ?? loan.repaidAt ?? loan.lentDate,
        updatedAt: loan.updatedAt ?? loan.createdAt,
      })))
    .sort((first, second) => second.repaidAt.localeCompare(first.repaidAt) || second.updatedAt - first.updatedAt)
}

function cents(value: number): number {
  return Math.round(value * 100)
}

export function getAvailableBalance(transactions: Transaction[], loans: Loan[]): number {
  const transactionCents = transactions.reduce((total, transaction) => {
    const signedAmount = transaction.type === 'income' ? cents(transaction.amount) : -cents(transaction.amount)
    return total + signedAmount
  }, 0)
  const loanedCents = loans.reduce((total, loan) => total + cents(getLoanOutstanding(loan)), 0)
  return (transactionCents - loanedCents) / 100
}

export function calculateBalanceAdjustment(currentBalance: number, targetBalance: number): { type: TransactionType, amount: number } | null {
  if (!Number.isFinite(currentBalance) || !Number.isFinite(targetBalance)) throw new Error('El saldo debe ser un número válido.')
  const difference = cents(targetBalance) - cents(currentBalance)
  if (difference === 0) return null
  return {
    type: difference > 0 ? 'income' : 'expense',
    amount: Math.abs(difference) / 100,
  }
}

export interface CryptoAllocation {
  asset: string
  balance: number
  percentage: number
}

export function normalizeCryptoAsset(asset?: string): string {
  return asset?.trim().toUpperCase() || DEFAULT_CRYPTO_ASSET
}

export function getCryptoBalances(movements: ReserveMovement[]): Map<string, number> {
  const balances = new Map<string, number>()
  const changeBalance = (asset: string, amount: number) => {
    balances.set(asset, (balances.get(asset) ?? 0) + amount)
  }

  movements
    .filter((movement) => movement.reserve === 'crypto')
    .forEach((movement) => {
      const destination = normalizeCryptoAsset(movement.cryptoAsset)

      if (movement.action === 'deposit') {
        changeBalance(destination, movement.amount)
        return
      }

      if (movement.action === 'withdraw') {
        changeBalance(destination, -movement.amount)
        return
      }

      const source = normalizeCryptoAsset(movement.cryptoSourceAsset)
      changeBalance(source, -(movement.amount + (movement.fee ?? 0)))
      changeBalance(destination, movement.amount)
    })

  return balances
}

export function getCryptoAllocation(movements: ReserveMovement[]): CryptoAllocation[] {
  const positiveBalances = Array.from(getCryptoBalances(movements).entries())
    .filter(([, balance]) => balance > 0.005)
    .sort(([, first], [, second]) => second - first)
  const total = positiveBalances.reduce((sum, [, balance]) => sum + balance, 0)

  return positiveBalances.map(([asset, balance]) => ({
    asset,
    balance,
    percentage: total > 0 ? (balance / total) * 100 : 0,
  }))
}

export function getCryptoFees(movements: ReserveMovement[]): number {
  return movements
    .filter((movement) => movement.reserve === 'crypto')
    .reduce((sum, movement) => sum + (movement.fee ?? 0), 0)
}

export function getReserveTotals(movements: ReserveMovement[]) {
  const savings = movements
    .filter((movement) => movement.reserve === ('savings' satisfies ReserveType))
    .reduce((sum, movement) => sum + (movement.action === 'deposit' ? movement.amount : -movement.amount), 0)
  const crypto = Array.from(getCryptoBalances(movements).values()).reduce((sum, balance) => sum + balance, 0)
  return { savings, crypto, total: savings + crypto }
}
