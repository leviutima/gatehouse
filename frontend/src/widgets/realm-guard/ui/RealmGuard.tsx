import { Alert, Badge } from '@leviutima/ds'
import type { ReactNode } from 'react'
import { useRealmQuery } from '@/entities/realm'
import { SessionExpiredError } from '@/entities/session'
import { hasHttpStatus } from '@/shared/api'
import { LoadFailed } from '@/shared/ui'

interface RealmGuardProps {
  realm: string
  children: ReactNode
}

export function RealmGuard({ realm, children }: RealmGuardProps) {
  const { data, error, isFetching, refetch } = useRealmQuery(realm)

  if ((isFetching && !data) || error instanceof SessionExpiredError) {
    return <p className="text-sm text-muted-foreground">Loading realm…</p>
  }
  if (hasHttpStatus(error, 404)) {
    return <Alert tone="error">There is no realm called {realm}.</Alert>
  }
  if (!data) {
    return <LoadFailed what="realm" onRetry={() => void refetch()} />
  }
  return (
    <>
      {!data.enabled && (
        <Alert className="mb-6" title="This realm is disabled">
          Its users cannot sign in and its tokens are rejected. Enable it in{' '}
          <Badge variant="outline">Settings</Badge>.
        </Alert>
      )}
      {children}
    </>
  )
}
