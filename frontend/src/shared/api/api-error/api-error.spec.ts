import { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { apiErrorCode, apiErrorMessage } from './api-error.ts'

function httpError(data: unknown): AxiosError {
  const error = new AxiosError('HTTP 409')
  error.response = { status: 409, data } as AxiosResponse
  return error
}

describe('admin API errors', () => {
  it('reads the code and the message of an admin API answer', () => {
    const error = httpError({
      statusCode: 422,
      error: 'weak_password',
      message: 'Password must be between 8 and 256 characters long',
    })

    expect(apiErrorCode(error)).toBe('weak_password')
    expect(apiErrorMessage(error)).toBe(
      'Password must be between 8 and 256 characters long',
    )
  })

  it.each([
    ['an answer without a code', httpError({ message: 'oops' })],
    ['an answer without a body', httpError(undefined)],
    ['an error that is not from HTTP', new Error('network')],
  ])('gives nothing for %s', (_name, error) => {
    expect(apiErrorCode(error)).toBeUndefined()
    expect(apiErrorMessage(error)).toBeUndefined()
  })
})
