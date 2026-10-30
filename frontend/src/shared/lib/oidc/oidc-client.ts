import type { LoginTransaction } from './login-transaction.ts'
import type { OidcConfig } from './oidc-config.ts'

export interface ProviderMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint: string
}

export interface TokenSet {
  accessToken: string
  idToken: string | null
  refreshToken: string | null
  expiresInSeconds: number
}

export interface IdTokenClaims {
  iss: string
  aud: string | string[]
  sub: string
  nonce?: string
  preferred_username?: string
  email?: string
}

interface TokenResponse {
  access_token: string
  expires_in: number
  id_token?: string
  refresh_token?: string
}

interface OAuthErrorResponse {
  error?: string
  error_description?: string
}

export class OidcError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'OidcError'
    this.code = code
  }
}

export async function fetchProviderMetadata(
  config: OidcConfig,
): Promise<ProviderMetadata> {
  const response = await fetch(
    `${config.issuer}/.well-known/openid-configuration`,
  )
  if (!response.ok) {
    throw new OidcError(
      'discovery_failed',
      `Could not read the provider configuration (HTTP ${response.status})`,
    )
  }
  const metadata = (await response.json()) as ProviderMetadata
  if (metadata.issuer !== config.issuer) {
    throw new OidcError(
      'issuer_mismatch',
      'The provider configuration belongs to a different issuer',
    )
  }
  return metadata
}

export function authorizationUrl(
  metadata: ProviderMetadata,
  config: OidcConfig,
  transaction: LoginTransaction,
  codeChallenge: string,
): string {
  const url = new URL(metadata.authorization_endpoint)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }).toString()
  return url.toString()
}

export function authorizationCode(
  params: URLSearchParams,
  config: OidcConfig,
  transaction: LoginTransaction,
): string {
  if (params.get('state') !== transaction.state) {
    throw new OidcError(
      'state_mismatch',
      'This sign-in response does not match a sign-in started here',
    )
  }
  if (params.get('iss') !== config.issuer) {
    throw new OidcError(
      'issuer_mismatch',
      'This sign-in response came from a different issuer',
    )
  }
  const error = params.get('error')
  if (error) {
    throw new OidcError(error, params.get('error_description') ?? error)
  }
  const code = params.get('code')
  if (!code) {
    throw new OidcError('invalid_response', 'The sign-in response has no code')
  }
  return code
}

export function exchangeCode(
  metadata: ProviderMetadata,
  config: OidcConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenSet> {
  return requestTokens(metadata, {
    grant_type: 'authorization_code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code,
    code_verifier: codeVerifier,
  })
}

export function refreshTokens(
  metadata: ProviderMetadata,
  config: OidcConfig,
  refreshToken: string,
): Promise<TokenSet> {
  return requestTokens(metadata, {
    grant_type: 'refresh_token',
    client_id: config.clientId,
    refresh_token: refreshToken,
  })
}

export function verifiedIdTokenClaims(
  idToken: string | null,
  config: OidcConfig,
  nonce: string,
): IdTokenClaims {
  if (!idToken) {
    throw new OidcError('invalid_id_token', 'The sign-in returned no ID token')
  }
  const claims = decodeJwtPayload(idToken)
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (
    claims.iss !== config.issuer ||
    !audience.includes(config.clientId) ||
    claims.nonce !== nonce
  ) {
    throw new OidcError(
      'invalid_id_token',
      'The ID token was not issued for this sign-in',
    )
  }
  return claims
}

export function logoutUrl(
  metadata: ProviderMetadata,
  config: OidcConfig,
  idToken: string,
): string {
  const url = new URL(metadata.end_session_endpoint)
  url.search = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: config.postLogoutRedirectUri,
  }).toString()
  return url.toString()
}

async function requestTokens(
  metadata: ProviderMetadata,
  body: Record<string, string>,
): Promise<TokenSet> {
  const response = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  if (!response.ok) {
    const failure = (await response
      .json()
      .catch(() => ({}))) as OAuthErrorResponse
    throw new OidcError(
      failure.error ?? 'token_request_failed',
      failure.error_description ??
        `The token request failed (HTTP ${response.status})`,
    )
  }
  const tokens = (await response.json()) as TokenResponse
  return {
    accessToken: tokens.access_token,
    idToken: tokens.id_token ?? null,
    refreshToken: tokens.refresh_token ?? null,
    expiresInSeconds: tokens.expires_in,
  }
}

function decodeJwtPayload(jwt: string): IdTokenClaims {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as IdTokenClaims
  } catch {
    throw new OidcError('invalid_id_token', 'The ID token could not be read')
  }
}
