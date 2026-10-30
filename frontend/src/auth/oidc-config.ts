import type { OidcConfig } from '@/shared/lib/oidc'

const MASTER_REALM = 'master'
const CONSOLE_CLIENT_ID = 'admin-console'
const CONSOLE_SCOPE = 'openid profile email'

export function consoleOidcConfig(
  gatehouseUrl: string | undefined,
  consoleOrigin: string,
): OidcConfig {
  if (!gatehouseUrl) {
    throw new Error('VITE_GATEHOUSE_ISSUER is not set')
  }
  return {
    issuer: `${gatehouseUrl.replace(/\/+$/, '')}/realms/${MASTER_REALM}`,
    clientId: CONSOLE_CLIENT_ID,
    scope: CONSOLE_SCOPE,
    redirectUri: `${consoleOrigin}/callback`,
    postLogoutRedirectUri: `${consoleOrigin}/`,
  }
}
