import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthSession, SessionExpiredError } from './auth-session.ts'
import type { AuthBrowser } from './auth-session.ts'
import { saveLoginTransaction } from './login-transaction.ts'
import { consoleOidcConfig } from './oidc-config.ts'
import { fakeJwt, jsonResponse, providerMetadata } from './testing/fixtures.ts'
import { memoryStorage } from './testing/memory-storage.ts'

const config = consoleOidcConfig('http://id.test', 'http://console.test')
const transaction = { state: 'state-1', nonce: 'nonce-1', codeVerifier: 'v-1' }
const idToken = fakeJwt({
  iss: config.issuer,
  aud: 'admin-console',
  sub: 'user-1',
  nonce: 'nonce-1',
  preferred_username: 'admin',
})
const callbackSearch = new URLSearchParams({
  code: 'code-1',
  state: 'state-1',
  iss: config.issuer,
}).toString()

function fakeBrowser(pathname: string, search = '') {
  let now = 1_000_000
  return {
    storage: memoryStorage(),
    now: () => now,
    advance: (ms: number) => {
      now += ms
    },
    location: () => ({ pathname, search }),
    navigate: vi.fn<AuthBrowser['navigate']>(),
    replacePath: vi.fn<AuthBrowser['replacePath']>(),
  }
}

function tokenResponse(name: string) {
  return jsonResponse({
    access_token: `access-${name}`,
    refresh_token: `refresh-${name}`,
    expires_in: 300,
  })
}

describe('AuthSession', () => {
  const tokenEndpoint = vi.fn<(init?: RequestInit) => Promise<Response>>()

  beforeEach(() => {
    tokenEndpoint.mockReset()
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) =>
        url === providerMetadata.token_endpoint
          ? tokenEndpoint(init)
          : Promise.resolve(jsonResponse(providerMetadata)),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function signedInSession() {
    const browser = fakeBrowser('/callback', callbackSearch)
    saveLoginTransaction(browser.storage, transaction)
    tokenEndpoint.mockResolvedValueOnce(
      jsonResponse({
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        id_token: idToken,
        expires_in: 300,
      }),
    )
    const session = new AuthSession(config, browser)
    await session.start()
    return { browser, session }
  }

  it('redirects to the login with a saved transaction when opened fresh', async () => {
    const browser = fakeBrowser('/')

    const result = await new AuthSession(config, browser).start()

    expect(result).toEqual({ kind: 'redirecting' })
    const url = new URL(browser.navigate.mock.calls[0][0])
    expect(url.pathname).toBe('/realms/master/protocol/openid-connect/auth')
    expect(url.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/)
    expect(browser.storage.getItem('gatehouse.login-transaction')).toContain(
      url.searchParams.get('state'),
    )
  })

  it('exchanges the callback code once even if started twice', async () => {
    const browser = fakeBrowser('/callback', callbackSearch)
    saveLoginTransaction(browser.storage, transaction)
    tokenEndpoint.mockResolvedValueOnce(
      jsonResponse({
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        id_token: idToken,
        expires_in: 300,
      }),
    )
    const session = new AuthSession(config, browser)

    const [first, second] = await Promise.all([session.start(), session.start()])

    expect(first).toEqual({ kind: 'signed_in', user: { username: 'admin' } })
    expect(second).toBe(first)
    expect(tokenEndpoint).toHaveBeenCalledOnce()
  })

  it('removes the code from the address bar', async () => {
    const { browser } = await signedInSession()

    expect(browser.replacePath).toHaveBeenCalledWith('/')
  })

  it('refuses a callback whose state it did not start', async () => {
    const browser = fakeBrowser('/callback', callbackSearch)

    await expect(new AuthSession(config, browser).start()).rejects.toMatchObject(
      { code: 'state_mismatch' },
    )
    expect(tokenEndpoint).not.toHaveBeenCalled()
  })

  it('reuses the access token while it is valid', async () => {
    const { session } = await signedInSession()

    await expect(session.validAccessToken()).resolves.toBe('access-1')
    expect(tokenEndpoint).toHaveBeenCalledOnce()
  })

  it('refreshes near expiry and rotates the refresh token', async () => {
    const { browser, session } = await signedInSession()
    tokenEndpoint.mockResolvedValueOnce(tokenResponse('2'))
    tokenEndpoint.mockResolvedValueOnce(tokenResponse('3'))

    browser.advance(280_000)
    await expect(session.validAccessToken()).resolves.toBe('access-2')
    browser.advance(280_000)
    await expect(session.validAccessToken()).resolves.toBe('access-3')

    const lastBody = tokenEndpoint.mock.calls[2][0]?.body as URLSearchParams
    expect(lastBody.get('refresh_token')).toBe('refresh-2')
  })

  it('shares one refresh between concurrent callers', async () => {
    const { browser, session } = await signedInSession()
    tokenEndpoint.mockResolvedValueOnce(tokenResponse('2'))
    browser.advance(280_000)

    const tokens = await Promise.all([
      session.validAccessToken(),
      session.validAccessToken(),
      session.renewAccessToken(),
    ])

    expect(tokens).toEqual(['access-2', 'access-2', 'access-2'])
    expect(tokenEndpoint).toHaveBeenCalledTimes(2)
  })

  it('reports an expired session when the refresh token is refused', async () => {
    const { browser, session } = await signedInSession()
    tokenEndpoint.mockResolvedValueOnce(
      jsonResponse({ error: 'invalid_grant' }, 400),
    )
    browser.advance(280_000)

    await expect(session.validAccessToken()).rejects.toBeInstanceOf(
      SessionExpiredError,
    )
    await expect(session.validAccessToken()).rejects.toBeInstanceOf(
      SessionExpiredError,
    )
    expect(tokenEndpoint).toHaveBeenCalledTimes(2)
  })

  it('keeps the session through a network failure', async () => {
    const { browser, session } = await signedInSession()
    tokenEndpoint.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    tokenEndpoint.mockResolvedValueOnce(tokenResponse('2'))
    browser.advance(280_000)

    await expect(session.validAccessToken()).rejects.toBeInstanceOf(TypeError)
    await expect(session.validAccessToken()).resolves.toBe('access-2')
  })

  it('signs out with the id token kept across refreshes', async () => {
    const { browser, session } = await signedInSession()
    tokenEndpoint.mockResolvedValueOnce(tokenResponse('2'))
    browser.advance(280_000)
    await session.validAccessToken()

    await session.logout()

    const url = new URL(browser.navigate.mock.calls[0][0])
    expect(url.pathname).toBe('/realms/master/protocol/openid-connect/logout')
    expect(url.searchParams.get('id_token_hint')).toBe(idToken)
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
      'http://console.test/',
    )
  })
})
