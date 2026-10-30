import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionExpiredError } from '../auth/auth-session.ts'
import type { AuthSession } from '../auth/auth-session.ts'
import { jsonResponse } from '../auth/testing/fixtures.ts'
import { AdminApi, ApiError } from './admin-api.ts'

const realms = [{ id: '1', name: 'master', displayName: 'Master', enabled: true }]

describe('AdminApi', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const session = {
    validAccessToken: vi.fn<AuthSession['validAccessToken']>(),
    renewAccessToken: vi.fn<AuthSession['renewAccessToken']>(),
    redirectToLogin: vi.fn<AuthSession['redirectToLogin']>(),
  }
  const api = new AdminApi('http://id.test/', session as unknown as AuthSession)

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    session.validAccessToken.mockResolvedValue('access-1')
    session.renewAccessToken.mockResolvedValue('access-2')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the API with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(realms))

    await expect(api.listRealms()).resolves.toEqual(realms)

    expect(fetchMock).toHaveBeenCalledWith('http://id.test/admin/realms', {
      headers: { Authorization: 'Bearer access-1' },
    })
  })

  it('retries once with a renewed token after a 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 401))
    fetchMock.mockResolvedValueOnce(jsonResponse(realms))

    await expect(api.listRealms()).resolves.toEqual(realms)

    expect(fetchMock).toHaveBeenLastCalledWith('http://id.test/admin/realms', {
      headers: { Authorization: 'Bearer access-2' },
    })
  })

  it('sends the user to the login when the renewed token is refused too', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 401))

    await expect(api.listRealms()).rejects.toBeInstanceOf(SessionExpiredError)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(session.redirectToLogin).toHaveBeenCalledOnce()
  })

  it('sends the user to the login when the session has expired', async () => {
    session.validAccessToken.mockRejectedValue(new SessionExpiredError())

    await expect(api.listRealms()).rejects.toBeInstanceOf(SessionExpiredError)

    expect(session.redirectToLogin).toHaveBeenCalledOnce()
  })

  it('reports a forbidden answer without leaving the page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 403))

    const failure = await api.listRealms().catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 403 })
    expect(session.redirectToLogin).not.toHaveBeenCalled()
  })
})
