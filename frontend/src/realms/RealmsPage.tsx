import { useEffect, useState } from 'react'
import { AdminApi, ApiError } from '../api/admin-api.ts'
import type { Realm } from '../api/admin-api.ts'
import { SessionExpiredError } from '../auth/auth-session.ts'

type RealmsState =
  | { kind: 'loading' }
  | { kind: 'loaded'; realms: Realm[] }
  | { kind: 'forbidden' }
  | { kind: 'failed' }

interface RealmsPageProps {
  api: AdminApi
}

export function RealmsPage({ api }: RealmsPageProps) {
  const [state, setState] = useState<RealmsState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    api.listRealms().then(
      (realms) => {
        if (current) {
          setState({ kind: 'loaded', realms })
        }
      },
      (error: unknown) => {
        if (current && !(error instanceof SessionExpiredError)) {
          setState(
            error instanceof ApiError && error.status === 403
              ? { kind: 'forbidden' }
              : { kind: 'failed' },
          )
        }
      },
    )
    return () => {
      current = false
    }
  }, [api, attempt])

  switch (state.kind) {
    case 'loading':
      return <p className="muted">Loading realms…</p>
    case 'forbidden':
      return (
        <p role="alert">
          This account is not an administrator of the master realm, so it cannot
          list realms.
        </p>
      )
    case 'failed':
      return (
        <div role="alert">
          <p>The realms could not be loaded.</p>
          <button
            type="button"
            onClick={() => {
              setState({ kind: 'loading' })
              setAttempt((value) => value + 1)
            }}
          >
            Try again
          </button>
        </div>
      )
    case 'loaded':
      return (
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Display name</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {state.realms.map((realm) => (
              <tr key={realm.id}>
                <td>
                  <code>{realm.name}</code>
                </td>
                <td>{realm.displayName}</td>
                <td>{realm.enabled ? 'Enabled' : 'Disabled'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
  }
}
