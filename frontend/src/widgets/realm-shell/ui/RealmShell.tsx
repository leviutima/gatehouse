import { Alert, Badge } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useRealmQuery } from '@/entities/realm'
import { SessionExpiredError } from '@/entities/session'
import { hasHttpStatus } from '@/shared/api'
import { LoadFailed } from '@/shared/ui'

interface RealmShellProps {
  realm: string
  children: ReactNode
}

const tabs = [
  { to: '/realms/$realm/roles', label: 'Roles' },
  { to: '/realms/$realm/clients', label: 'Clients' },
  { to: '/realms/$realm/users', label: 'Users' },
  { to: '/realms/$realm/settings', label: 'Settings' },
] as const

export function RealmShell({ realm, children }: RealmShellProps) {
  const { data, error, isFetching, refetch } = useRealmQuery(realm)

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        to="/realms"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Realms
      </Link>
      <div className="mt-2 mb-6 flex items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold">{realm}</h1>
        {data && data.displayName !== realm && (
          <span className="text-muted-foreground">{data.displayName}</span>
        )}
        {data && !data.enabled && <Badge variant="outline">Disabled</Badge>}
      </div>
      {(isFetching && !data) || error instanceof SessionExpiredError ? (
        <p className="text-sm text-muted-foreground">Loading realm…</p>
      ) : hasHttpStatus(error, 404) ? (
        <Alert tone="error">There is no realm called {realm}.</Alert>
      ) : !data ? (
        <LoadFailed what="realm" onRetry={() => void refetch()} />
      ) : (
        <>
          <nav className="mb-6 flex gap-5 border-b border-border text-sm">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                params={{ realm }}
                className="-mb-px border-b-2 pb-2"
                activeProps={{ className: 'border-foreground text-foreground' }}
                inactiveProps={{
                  className:
                    'border-transparent text-muted-foreground hover:text-foreground',
                }}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          {children}
        </>
      )}
    </main>
  )
}
