import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminApi } from './api/admin-api.ts'
import { AuthSession, consoleOidcConfig } from '@/entities/session'
import { env } from '@/shared/config'

const session = new AuthSession(
  consoleOidcConfig(env.VITE_GATEHOUSE_ISSUER, window.location.origin),
  {
    storage: window.sessionStorage,
    now: () => Date.now(),
    location: () => window.location,
    navigate: (url) => window.location.assign(url),
    replacePath: (path) => window.history.replaceState(null, '', path),
  },
)
const api = new AdminApi(env.VITE_GATEHOUSE_ISSUER, session)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App session={session} api={api} />
  </StrictMode>,
)
