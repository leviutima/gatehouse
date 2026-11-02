export interface OidcConfig {
  issuer: string
  clientId: string
  scope: string
  redirectUri: string
  postLogoutRedirectUri: string
}
