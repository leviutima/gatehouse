import { Button } from '@leviutima/ds'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import type { SessionUser } from '@/entities/session'
import { AppHeader } from '@/widgets/app-header'
import { createAppRouter } from './router/router.tsx'
import type { AppRouter } from './router/router.tsx'

type AppState =
  | { kind: 'starting' }
  | { kind: 'signed_in'; user: SessionUser; router: AppRouter }
  | { kind: 'failed'; message: string }

export function App() {
  const session = useSession()
  const [state, setState] = useState<AppState>({ kind: 'starting' })

  useEffect(() => {
    session.start().then(
      (result) => {
        if (result.kind === 'signed_in') {
          setState({
            kind: 'signed_in',
            user: result.user,
            router: createAppRouter(),
          })
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
      return <p className="mx-auto mt-[20vh] max-w-120 px-4 text-center text-sm text-muted-foreground">Signing in…</p>
    case 'failed':
      return (
        <main className="mx-auto mt-[20vh] max-w-120 px-4 text-center" role="alert">
          <h1 className="mb-2 text-xl font-semibold">Could not sign in</h1>
          <p className="mb-4 text-sm text-muted-foreground">{state.message}</p>
          <Button onClick={() => void session.redirectToLogin()}>Try again</Button>
        </main>
      )
    case 'signed_in':
      return (
        <>
          <AppHeader username={state.user.username} />
          <RouterProvider router={state.router} />
        </>
      )
  }
}
