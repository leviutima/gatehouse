import { takeLoginTransaction, saveLoginTransaction } from './login-transaction.ts'
import type { TransactionStorage } from './login-transaction.ts'
import {
  authorizationCode,
  authorizationUrl,
  exchangeCode,
  fetchProviderMetadata,
  logoutUrl,
  OidcError,
  refreshTokens,
  verifiedIdTokenClaims,
} from './oidc-client.ts'
import type { ProviderMetadata, TokenSet } from './oidc-client.ts'
import type { OidcConfig } from './oidc-config.ts'
import { randomToken, s256Challenge } from './pkce.ts'

const CALLBACK_PATH = '/callback'
const EXPIRY_MARGIN_MS = 30_000

export interface AuthBrowser {
  storage: TransactionStorage
  now(): number
  location(): { pathname: string; search: string }
  navigate(url: string): void
  replacePath(path: string): void
}

export interface SessionUser {
  username: string
}

export type SessionStart =
  | { kind: 'redirecting' }
  | { kind: 'signed_in'; user: SessionUser }

export class SessionExpiredError extends Error {
  constructor() {
    super('The session has expired')
    this.name = 'SessionExpiredError'
  }
}

export class AuthSession {
  private readonly config: OidcConfig
  private readonly browser: AuthBrowser
  private metadata: Promise<ProviderMetadata> | null = null
  private started: Promise<SessionStart> | null = null
  private refreshing: Promise<string> | null = null
  private accessToken: string | null = null
  private accessTokenExpiresAt = 0
  private idToken: string | null = null
  private refreshToken: string | null = null

  constructor(config: OidcConfig, browser: AuthBrowser) {
    this.config = config
    this.browser = browser
  }

  start(): Promise<SessionStart> {
    this.started ??= this.begin()
    return this.started
  }

  async validAccessToken(): Promise<string> {
    if (
      this.accessToken &&
      this.browser.now() < this.accessTokenExpiresAt - EXPIRY_MARGIN_MS
    ) {
      return this.accessToken
    }
    return this.renewAccessToken()
  }

  renewAccessToken(): Promise<string> {
    this.refreshing ??= this.refresh().finally(() => {
      this.refreshing = null
    })
    return this.refreshing
  }

  async redirectToLogin(): Promise<void> {
    const transaction = {
      state: randomToken(),
      nonce: randomToken(),
      codeVerifier: randomToken(),
    }
    const [metadata, challenge] = await Promise.all([
      this.providerMetadata(),
      s256Challenge(transaction.codeVerifier),
    ])
    saveLoginTransaction(this.browser.storage, transaction)
    this.browser.navigate(
      authorizationUrl(metadata, this.config, transaction, challenge),
    )
  }

  async logout(): Promise<void> {
    if (!this.idToken) {
      return this.redirectToLogin()
    }
    const metadata = await this.providerMetadata()
    this.browser.navigate(logoutUrl(metadata, this.config, this.idToken))
  }

  private async begin(): Promise<SessionStart> {
    const { pathname, search } = this.browser.location()
    if (pathname === CALLBACK_PATH) {
      return this.completeLogin(new URLSearchParams(search))
    }
    await this.redirectToLogin()
    return { kind: 'redirecting' }
  }

  private async completeLogin(params: URLSearchParams): Promise<SessionStart> {
    const transaction = takeLoginTransaction(this.browser.storage)
    this.browser.replacePath('/')
    if (!transaction) {
      throw new OidcError(
        'state_mismatch',
        'This sign-in response does not match a sign-in started here',
      )
    }
    const code = authorizationCode(params, this.config, transaction)
    const metadata = await this.providerMetadata()
    const tokens = await exchangeCode(
      metadata,
      this.config,
      code,
      transaction.codeVerifier,
    )
    const claims = verifiedIdTokenClaims(
      tokens.idToken,
      this.config,
      transaction.nonce,
    )
    this.store(tokens)
    return {
      kind: 'signed_in',
      user: { username: claims.preferred_username ?? claims.email ?? claims.sub },
    }
  }

  private async refresh(): Promise<string> {
    if (!this.refreshToken) {
      throw new SessionExpiredError()
    }
    const metadata = await this.providerMetadata()
    try {
      const tokens = await refreshTokens(
        metadata,
        this.config,
        this.refreshToken,
      )
      this.store(tokens)
      return tokens.accessToken
    } catch (error) {
      if (error instanceof OidcError && error.code === 'invalid_grant') {
        this.refreshToken = null
        this.accessToken = null
        throw new SessionExpiredError()
      }
      throw error
    }
  }

  private store(tokens: TokenSet): void {
    this.accessToken = tokens.accessToken
    this.accessTokenExpiresAt =
      this.browser.now() + tokens.expiresInSeconds * 1000
    this.idToken = tokens.idToken ?? this.idToken
    this.refreshToken = tokens.refreshToken ?? this.refreshToken
  }

  private providerMetadata(): Promise<ProviderMetadata> {
    this.metadata ??= fetchProviderMetadata(this.config).catch((error) => {
      this.metadata = null
      throw error
    })
    return this.metadata
  }
}
