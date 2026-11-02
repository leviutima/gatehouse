import { describe, expect, it } from 'vitest'
import {
  saveLoginTransaction,
  takeLoginTransaction,
} from './login-transaction.ts'
import { memoryStorage } from './testing/memory-storage.ts'

const transaction = { state: 's', nonce: 'n', codeVerifier: 'v' }

describe('login transaction', () => {
  it('returns the saved transaction only once', () => {
    const storage = memoryStorage()
    saveLoginTransaction(storage, transaction)

    expect(takeLoginTransaction(storage)).toEqual(transaction)
    expect(takeLoginTransaction(storage)).toBeNull()
  })

  it('returns null when nothing was saved', () => {
    expect(takeLoginTransaction(memoryStorage())).toBeNull()
  })

  it.each(['not json', 'null', '{"state":"s"}'])(
    'discards the malformed value %s',
    (stored) => {
      const storage = memoryStorage()
      storage.setItem('gatehouse.login-transaction', stored)

      expect(takeLoginTransaction(storage)).toBeNull()
      expect(storage.getItem('gatehouse.login-transaction')).toBeNull()
    },
  )
})
