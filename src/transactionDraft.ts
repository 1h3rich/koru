import { withoutPurchaseBatchImages } from './purchaseBatch.ts'
import type { ReceiptDetails, TransactionFormDraftData, TransactionDraft } from './types'

function withoutReceiptImage(receipt: ReceiptDetails | null): ReceiptDetails | null {
  if (!receipt) return null
  return {
    merchant: receipt.merchant,
    total: receipt.total,
    items: receipt.items.map((item) => ({ ...item })),
  }
}

export function createTransactionFormDraft(
  draft: TransactionDraft,
  receipt: ReceiptDetails | null,
  purchaseBatch: TransactionFormDraftData['purchaseBatch'],
): TransactionFormDraftData {
  return {
    draft: { ...draft },
    receipt: withoutReceiptImage(receipt),
    purchaseBatch: withoutPurchaseBatchImages(purchaseBatch),
  }
}

export function hasTransactionFormDraft(data: TransactionFormDraftData): boolean {
  return Boolean(
    data.draft.amount.trim()
    || data.draft.description.trim()
    || data.receipt
    || data.purchaseBatch?.values.length,
  )
}
