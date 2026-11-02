import { isAxiosError } from 'axios'
import { z } from 'zod'
import type { LoginTransaction } from './login-transaction.ts'
import type { OidcConfig } from './oidc-config/oidc-config.ts'
import { oidcHttp } from './oidc-http/oidc-http.ts'

const providerMetadataSchema = z.object({
  issuer: z.string(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  end_session_endpoint: z.url(),
})

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  id_token: z.string().optional(),
  refresh_token: z.string().optional(),
})

const oauthErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
})

const idTokenClaimsSchema = z.object({
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  sub: z.string(),
  nonce: z.string().optional(),
  preferred_username: z.string().optional(),
  email: z.string().optional(),
})

export type ProviderMetadata = z.infer<typeof providerMetadataSchema>

export type IdTokenClaims = z.infer<typeof idTokenClaimsSchema>

export interface TokenSet {
  accessToken: string
  idToken: string | null
  refreshToken: string | null
  expiresInSeconds: number
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
  const response = await oidcHttp
    .get<unknown>(`${config.issuer}/.well-known/openid-configuration`)
    .catch((error: unknown) => {
      if (isAxiosError(error) && error.response) {
        throw new OidcError(
          'discovery_failed',
          `Could not read the provider configuration (HTTP ${error.response.status})`,
        )
      }
      throw error
    })
  const metadata = providerMetadataSchema.safeParse(response.data)
  if (!metadata.success) {
    throw new OidcError(
      'invalid_response',
      'The provider configuration is not valid',
    )
  }
  if (metadata.data.issuer !== config.issuer) {
    throw new OidcError(
      'issuer_mismatch',
      'The provider configuration belongs to a different issuer',
    )
  }
  return metadata.data
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
  const response = await oidcHttp
    .post<unknown>(metadata.token_endpoint, new URLSearchParams(body), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    .catch((error: unknown) => {
      if (isAxiosError(error) && error.response) {
        throw tokenRequestError(error.response.status, error.response.data)
      }
      throw error
    })
  const tokens = tokenResponseSchema.safeParse(response.data)
  if (!tokens.success) {
    throw new OidcError('invalid_response', 'The token response is not valid')
  }
  return {
    accessToken: tokens.data.access_token,
    idToken: tokens.data.id_token ?? null,
    refreshToken: tokens.data.refresh_token ?? null,
    expiresInSeconds: tokens.data.expires_in,
  }
}

function tokenRequestError(status: number, data: unknown): OidcError {
  const failure = oauthErrorSchema.safeParse(data)
  return failure.success
    ? new OidcError(
        failure.data.error,
        failure.data.error_description ??
          `The token request failed (HTTP ${status})`,
      )
    : new OidcError(
        'token_request_failed',
        `The token request failed (HTTP ${status})`,
      )
}

function decodeJwtPayload(jwt: string): IdTokenClaims {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
    return idTokenClaimsSchema.parse(
      JSON.parse(new TextDecoder().decode(bytes)),
    )
  } catch {
    throw new OidcError('invalid_id_token', 'The ID token could not be read')
  }
}
