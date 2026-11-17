import { Alert } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useClientQuery } from '@/entities/client'
import { SessionExpiredError } from '@/entities/session'
import { EditClientForm } from '@/features/client-settings'
import { CreateRoleForm } from '@/features/create-role'
import { RotateClientSecret } from '@/features/rotate-client-secret'
import { hasHttpStatus } from '@/shared/api'
import { LoadFailed } from '@/shared/ui'
import { RolesTable } from '@/widgets/roles-table'

interface ClientPageProps {
  realm: string
  clientId: string
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

export function ClientPage({ realm, clientId }: ClientPageProps) {
  const { data, error, isFetching, refetch } = useClientQuery(realm, clientId)

  const back = (
    <Link
      to="/realms/$realm/clients"
      params={{ realm }}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      ← Clients
    </Link>
  )

  if ((isFetching && !data) || error instanceof SessionExpiredError) {
    return <p className="text-sm text-muted-foreground">Loading client…</p>
  }
  if (hasHttpStatus(error, 404)) {
    return (
      <div className="flex flex-col items-start gap-4">
        {back}
        <Alert tone="error">There is no client called {clientId}.</Alert>
      </div>
    )
  }
  if (!data) {
    return <LoadFailed what="client" onRetry={() => void refetch()} />
  }
  return (
    <div className="flex flex-col gap-8">
      <div>
        {back}
        <h2 className="mt-2 text-lg font-semibold">
          <span className="font-mono">{data.clientId}</span>
          <span className="ml-2 font-normal text-muted-foreground">{data.name}</span>
        </h2>
      </div>
      <Section title="Settings">
        <EditClientForm key={data.id} realm={realm} client={data} />
      </Section>
      {data.type === 'CONFIDENTIAL' && (
        <Section title="Secret">
          <RotateClientSecret realm={realm} clientId={data.clientId} />
        </Section>
      )}
      <Section title="Client roles">
        <p className="mb-4 text-sm text-muted-foreground">
          Roles that only mean something to this client. They go in{' '}
          <code className="font-mono">resource_access.{data.clientId}</code> of
          the tokens this client receives.
        </p>
        <CreateRoleForm scope={{ realm, clientId: data.clientId }} />
        <RolesTable scope={{ realm, clientId: data.clientId }} />
      </Section>
    </div>
  )
}
