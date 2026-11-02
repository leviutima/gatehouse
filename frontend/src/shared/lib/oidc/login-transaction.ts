import { z } from 'zod'

const STORAGE_KEY = 'gatehouse.login-transaction'

const loginTransactionSchema = z.object({
  state: z.string().min(1),
  nonce: z.string().min(1),
  codeVerifier: z.string().min(1),
})

export type LoginTransaction = z.infer<typeof loginTransactionSchema>

export type TransactionStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>

export function saveLoginTransaction(
  storage: TransactionStorage,
  transaction: LoginTransaction,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(transaction))
}

export function takeLoginTransaction(
  storage: TransactionStorage,
): LoginTransaction | null {
  const stored = storage.getItem(STORAGE_KEY)
  storage.removeItem(STORAGE_KEY)
  if (!stored) {
    return null
  }
  try {
    return loginTransactionSchema.parse(JSON.parse(stored))
  } catch {
    return null
  }
}
