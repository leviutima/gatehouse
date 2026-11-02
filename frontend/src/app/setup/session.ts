import {
  AuthSession,
  consoleOidcConfig,
  installSessionInterceptors,
} from '@/entities/session'
import { adminHttp } from '@/shared/api'
import { env } from '@/shared/config'

export const session = new AuthSession(
  consoleOidcConfig(env.VITE_GATEHOUSE_ISSUER, window.location.origin),
  {
    storage: window.sessionStorage,
    now: () => Date.now(),
    location: () => window.location,
    navigate: (url) => window.location.assign(url),
    replacePath: (path) => window.history.replaceState(null, '', path),
  },
)

installSessionInterceptors(adminHttp, session)
