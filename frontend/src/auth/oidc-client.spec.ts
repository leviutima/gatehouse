import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authorizationCode,
  authorizationUrl,
  exchangeCode,
  fetchProviderMetadata,
  logoutUrl,
  verifiedIdTokenClaims,
} from './oidc-client.ts'
import { consoleOidcConfig } from './oidc-config.ts'
import { fakeJwt, jsonResponse, providerMetadata } from './testing/fixtures.ts'

const config = consoleOidcConfig('http://id.test', 'http://console.test')
const transaction = { state: 'state-1', nonce: 'nonce-1', codeVerifier: 'v-1' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchProviderMetadata', () => {
  it('rejects a document published for another issuer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ ...providerMetadata, issuer: 'http://evil.test' }),
      ),
    )

    await expect(fetchProviderMetadata(config)).rejects.toMatchObject({
      code: 'issuer_mismatch',
    })
  })
})

describe('authorizationUrl', () => {
  it('asks for a code protected by an S256 challenge', () => {
    const url = new URL(
      authorizationUrl(providerMetadata, config, transaction, 'challenge-1'),
    )

    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'admin-console',
      redirect_uri: 'http://console.test/callback',
      scope: 'openid profile email',
      state: 'state-1',
      nonce: 'nonce-1',
      code_challenge: 'challenge-1',
      code_challenge_method: 'S256',
    })
  })
})

describe('authorizationCode', () => {
  const response = (values: Record<string, string>) =>
    new URLSearchParams({
      state: 'state-1',
      iss: config.issuer,
      ...values,
    })

  it('returns the code of a response matching the transaction', () => {
    expect(
      authorizationCode(response({ code: 'code-1' }), config, transaction),
    ).toBe('code-1')
  })

  it('rejects a response with another state', () => {
    expect(() =>
      authorizationCode(
        response({ code: 'code-1', state: 'forged' }),
        config,
        transaction,
      ),
    ).toThrow(expect.objectContaining({ code: 'state_mismatch' }))
  })

  it('rejects a response from another issuer', () => {
    expect(() =>
      authorizationCode(
        response({ code: 'code-1', iss: 'http://evil.test' }),
        config,
        transaction,
      ),
    ).toThrow(expect.objectContaining({ code: 'issuer_mismatch' }))
  })

  it('surfaces the error sent by the provider', () => {
    expect(() =>
      authorizationCode(
        response({ error: 'invalid_scope', error_description: 'Bad scope' }),
        config,
        transaction,
      ),
    ).toThrow(
      expect.objectContaining({ code: 'invalid_scope', message: 'Bad scope' }),
    )
  })
})

describe('exchangeCode', () => {
  it('sends the code with its verifier and no client secret', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        access_token: 'access',
        expires_in: 300,
        id_token: 'id',
        refresh_token: 'refresh',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const tokens = await exchangeCode(
      providerMetadata,
      config,
      'code-1',
      'v-1',
    )

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(providerMetadata.token_endpoint)
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      grant_type: 'authorization_code',
      client_id: 'admin-console',
      redirect_uri: 'http://console.test/callback',
      code: 'code-1',
      code_verifier: 'v-1',
    })
    expect(tokens).toEqual({
      accessToken: 'access',
      idToken: 'id',
      refreshToken: 'refresh',
      expiresInSeconds: 300,
    })
  })

  it('surfaces the OAuth error of a refused request', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: 'invalid_grant' }, 400)),
    )

    await expect(
      exchangeCode(providerMetadata, config, 'code-1', 'v-1'),
    ).rejects.toMatchObject({ code: 'invalid_grant' })
  })
})

describe('verifiedIdTokenClaims', () => {
  const claims = {
    iss: config.issuer,
    aud: 'admin-console',
    sub: 'user-1',
    nonce: 'nonce-1',
    preferred_username: 'joão',
  }

  it('returns the claims of a token issued for this sign-in', () => {
    expect(
      verifiedIdTokenClaims(fakeJwt(claims), config, 'nonce-1'),
    ).toEqual(claims)
  })

  it.each([
    ['issuer', { iss: 'http://evil.test' }],
    ['audience', { aud: 'other-client' }],
    ['nonce', { nonce: 'replayed' }],
  ])('rejects a token with another %s', (_name, override) => {
    expect(() =>
      verifiedIdTokenClaims(
        fakeJwt({ ...claims, ...override }),
        config,
        'nonce-1',
      ),
    ).toThrow(expect.objectContaining({ code: 'invalid_id_token' }))
  })

  it.each([[null], ['not-a-jwt']])('rejects the token %s', (token) => {
    expect(() => verifiedIdTokenClaims(token, config, 'nonce-1')).toThrow(
      expect.objectContaining({ code: 'invalid_id_token' }),
    )
  })
})

describe('logoutUrl', () => {
  it('identifies the session and returns to the console', () => {
    const url = new URL(logoutUrl(providerMetadata, config, 'id-token'))

    expect(Object.fromEntries(url.searchParams)).toEqual({
      id_token_hint: 'id-token',
      post_logout_redirect_uri: 'http://console.test/',
    })
  })
})
