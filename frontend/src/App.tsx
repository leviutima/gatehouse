import { useEffect, useState } from 'react'
import { AdminApi } from './api/admin-api.ts'
import { AuthSession } from './auth/auth-session.ts'
import type { SessionUser } from './auth/auth-session.ts'
import { RealmsPage } from './realms/RealmsPage.tsx'

type AppState =
  | { kind: 'starting' }
  | { kind: 'signed_in'; user: SessionUser }
  | { kind: 'failed'; message: string }

interface AppProps {
  session: AuthSession
  api: AdminApi
}

function App({ session, api }: AppProps) {
  const [state, setState] = useState<AppState>({ kind: 'starting' })

  useEffect(() => {
    session.start().then(
      (result) => {
        if (result.kind === 'signed_in') {
          setState({ kind: 'signed_in', user: result.user })
        }
      },
      (error: unknown) => {
        setState({
          kind: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      },
    )
  }, [session])

  switch (state.kind) {
    case 'starting':
      return <p className="centered muted">Signing in…</p>
    case 'failed':
      return (
        <main className="centered" role="alert">
          <h1>Could not sign in</h1>
          <p>{state.message}</p>
          <button type="button" onClick={() => void session.redirectToLogin()}>
            Try again
          </button>
        </main>
      )
    case 'signed_in':
      return (
        <>
          <header className="topbar">
            <strong>Gatehouse</strong>
            <span className="muted">{state.user.username}</span>
            <button type="button" onClick={() => void session.logout()}>
              Sign out
            </button>
          </header>
          <main className="content">
            <h1>Realms</h1>
            <RealmsPage api={api} />
          </main>
        </>
      )
  }
}

export default App
