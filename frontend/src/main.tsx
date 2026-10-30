import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminApi } from './api/admin-api.ts'
import { AuthSession } from './auth/auth-session.ts'
import { consoleOidcConfig } from './auth/oidc-config.ts'

const gatehouseUrl = import.meta.env.VITE_GATEHOUSE_ISSUER as string | undefined
const session = new AuthSession(
  consoleOidcConfig(gatehouseUrl, window.location.origin),
  {
    storage: window.sessionStorage,
    now: () => Date.now(),
    location: () => window.location,
    navigate: (url) => window.location.assign(url),
    replacePath: (path) => window.history.replaceState(null, '', path),
  },
)
const api = new AdminApi(gatehouseUrl ?? '', session)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App session={session} api={api} />
  </StrictMode>,
)
