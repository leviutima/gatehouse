const STORAGE_KEY = 'gatehouse.login-transaction'

export interface LoginTransaction {
  state: string
  nonce: string
  codeVerifier: string
}

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
    const parsed = JSON.parse(stored) as Partial<LoginTransaction> | null
    return parsed?.state && parsed.nonce && parsed.codeVerifier
      ? {
          state: parsed.state,
          nonce: parsed.nonce,
          codeVerifier: parsed.codeVerifier,
        }
      : null
  } catch {
    return null
  }
}
