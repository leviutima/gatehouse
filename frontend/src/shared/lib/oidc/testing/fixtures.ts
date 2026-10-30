import type { ProviderMetadata } from '../oidc-client.ts'

const ENDPOINTS = 'http://id.test/realms/master/protocol/openid-connect'

export const providerMetadata: ProviderMetadata = {
  issuer: 'http://id.test/realms/master',
  authorization_endpoint: `${ENDPOINTS}/auth`,
  token_endpoint: `${ENDPOINTS}/token`,
  end_session_endpoint: `${ENDPOINTS}/logout`,
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function fakeJwt(claims: object): string {
  const encode = (value: object) =>
    btoa(
      String.fromCharCode(
        ...new TextEncoder().encode(JSON.stringify(value)),
      ),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${encode({ alg: 'ES256' })}.${encode(claims)}.signature`
}
