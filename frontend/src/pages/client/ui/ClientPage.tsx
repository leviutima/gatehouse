import { Alert, Badge } from '@leviutima/ds'
import { useClientQuery } from '@/entities/client'
import { SessionExpiredError } from '@/entities/session'
import { EditClientForm } from '@/features/client-settings'
import { CreateRoleForm } from '@/features/create-role'
import { RotateClientSecret } from '@/features/rotate-client-secret'
import { hasHttpStatus } from '@/shared/api'
import { LoadFailed, PageHeader, SettingsSection } from '@/shared/ui'
import { RolesTable } from '@/widgets/roles-table'

interface ClientPageProps {
  realm: string
  clientId: string
}

export function ClientPage({ realm, clientId }: ClientPageProps) {
  const { data, error, isFetching, refetch } = useClientQuery(realm, clientId)

  if ((isFetching && !data) || error instanceof SessionExpiredError) {
    return <p className="text-sm text-muted-foreground">Loading client…</p>
  }
  if (hasHttpStatus(error, 404)) {
    return <Alert tone="error">There is no client called {clientId}.</Alert>
  }
  if (!data) {
    return <LoadFailed what="client" onRetry={() => void refetch()} />
  }
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono">{data.clientId}</span>
            <Badge variant="outline">
              {data.type === 'PUBLIC' ? 'Public' : 'Confidential'}
            </Badge>
            {!data.enabled && <Badge variant="outline">Disabled</Badge>}
          </span>
        }
        description={data.name}
      />
      <EditClientForm key={data.id} realm={realm} client={data} />
      {data.type === 'CONFIDENTIAL' && (
        <SettingsSection
          title="Secret"
          description="The password this client uses to get tokens. Gatehouse only stores its hash."
        >
          <RotateClientSecret realm={realm} clientId={data.clientId} />
        </SettingsSection>
      )}
      <SettingsSection
        title="Client roles"
        description={
          <>
            Roles that only mean something to this client. They go in{' '}
            <code className="font-mono">resource_access.{data.clientId}</code>{' '}
            of the tokens this client receives.
          </>
        }
      >
        <CreateRoleForm scope={{ realm, clientId: data.clientId }} />
        <RolesTable scope={{ realm, clientId: data.clientId }} />
      </SettingsSection>
    </>
  )
}
