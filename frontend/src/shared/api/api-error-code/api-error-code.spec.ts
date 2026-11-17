import { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { apiErrorCode } from './api-error-code.ts'

function httpError(data: unknown): AxiosError {
  const error = new AxiosError('HTTP 409')
  error.response = { status: 409, data } as AxiosResponse
  return error
}

describe('apiErrorCode', () => {
  it('reads the error code of an admin API answer', () => {
    expect(
      apiErrorCode(
        httpError({
          statusCode: 409,
          error: 'role_already_exists',
          message: 'taken',
        }),
      ),
    ).toBe('role_already_exists')
  })

  it.each([
    ['an answer without a code', httpError({ message: 'oops' })],
    ['an answer without a body', httpError(undefined)],
    ['an error that is not from HTTP', new Error('network')],
  ])('gives nothing for %s', (_name, error) => {
    expect(apiErrorCode(error)).toBeUndefined()
  })
})
