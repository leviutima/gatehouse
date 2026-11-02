import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import type { SessionUser } from '@/entities/session'
import { RealmsPage } from '@/pages/realms'
import { AppHeader } from '@/widgets/app-header'

type AppState =
  | { kind: 'starting' }
  | { kind: 'signed_in'; user: SessionUser }
  | { kind: 'failed'; message: string }

export function App() {
  const session = useSession()
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
          <AppHeader username={state.user.username} />
          <RealmsPage />
        </>
      )
  }
}
