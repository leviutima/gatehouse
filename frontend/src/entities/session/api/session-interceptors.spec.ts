import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hasHttpStatus } from '@/shared/api'
import { fakeAdapter } from '@/shared/api/testing/fake-adapter.ts'
import type { FakeResponse } from '@/shared/api/testing/fake-adapter.ts'
import { SessionExpiredError } from '../model/auth-session/auth-session.ts'
import type { AuthSession } from '../model/auth-session/auth-session.ts'
import { installSessionInterceptors } from './session-interceptors.ts'

const realms = [{ name: 'master' }]

describe('installSessionInterceptors', () => {
  const endpoint = vi.fn<(authorization: unknown) => FakeResponse>()
  const session = {
    validAccessToken: vi.fn<AuthSession['validAccessToken']>(),
    renewAccessToken: vi.fn<AuthSession['renewAccessToken']>(),
    redirectToLogin: vi.fn<AuthSession['redirectToLogin']>(),
  }
  const http = axios.create({
    baseURL: 'http://id.test',
    adapter: fakeAdapter((config) =>
      endpoint(config.headers.get('Authorization')),
    ),
  })
  installSessionInterceptors(http, session as unknown as AuthSession)

  beforeEach(() => {
    vi.resetAllMocks()
    session.validAccessToken.mockResolvedValue('access-1')
    session.renewAccessToken.mockResolvedValue('access-2')
  })

  it('calls the API with the bearer token', async () => {
    endpoint.mockReturnValueOnce({ status: 200, data: realms })

    const response = await http.get('/admin/realms')

    expect(response.data).toEqual(realms)
    expect(endpoint).toHaveBeenCalledWith('Bearer access-1')
  })

  it('retries once with a renewed token after a 401', async () => {
    endpoint.mockReturnValueOnce({ status: 401 })
    endpoint.mockReturnValueOnce({ status: 200, data: realms })

    const response = await http.get('/admin/realms')

    expect(response.data).toEqual(realms)
    expect(endpoint).toHaveBeenLastCalledWith('Bearer access-2')
  })

  it('sends the user to the login when the renewed token is refused too', async () => {
    endpoint.mockReturnValue({ status: 401 })

    await expect(http.get('/admin/realms')).rejects.toBeInstanceOf(
      SessionExpiredError,
    )

    expect(endpoint).toHaveBeenCalledTimes(2)
    expect(session.redirectToLogin).toHaveBeenCalledOnce()
  })

  it('sends the user to the login when the session has expired', async () => {
    session.validAccessToken.mockRejectedValue(new SessionExpiredError())

    await expect(http.get('/admin/realms')).rejects.toBeInstanceOf(
      SessionExpiredError,
    )

    expect(endpoint).not.toHaveBeenCalled()
    expect(session.redirectToLogin).toHaveBeenCalledOnce()
  })

  it('sends the user to the login when the renewal finds the session expired', async () => {
    endpoint.mockReturnValueOnce({ status: 401 })
    session.renewAccessToken.mockRejectedValue(new SessionExpiredError())

    await expect(http.get('/admin/realms')).rejects.toBeInstanceOf(
      SessionExpiredError,
    )

    expect(session.redirectToLogin).toHaveBeenCalledOnce()
  })

  it('reports a forbidden answer without leaving the page', async () => {
    endpoint.mockReturnValueOnce({ status: 403 })

    const failure = await http.get('/admin/realms').catch((error: unknown) => error)

    expect(hasHttpStatus(failure, 403)).toBe(true)
    expect(session.redirectToLogin).not.toHaveBeenCalled()
    expect(session.renewAccessToken).not.toHaveBeenCalled()
  })
})
