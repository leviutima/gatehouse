import { Alert, Badge } from '@leviutima/ds'
import { SessionExpiredError } from '@/entities/session'
import { useUserQuery } from '@/entities/user'
import { SetUserPasswordForm } from '@/features/set-user-password'
import { UserRolesEditor } from '@/features/user-roles'
import { UserStatusSwitches } from '@/features/user-status'
import { hasHttpStatus } from '@/shared/api'
import { LoadFailed, PageHeader, SettingsSection } from '@/shared/ui'
import { UserClientRoles } from '@/widgets/user-client-roles'

interface UserPageProps {
  realm: string
  userId: string
}

export function UserPage({ realm, userId }: UserPageProps) {
  const { data, error, isFetching, refetch } = useUserQuery(realm, userId)

  if ((isFetching && !data) || error instanceof SessionExpiredError) {
    return <p className="text-sm text-muted-foreground">Loading user…</p>
  }
  if (hasHttpStatus(error, 404) || hasHttpStatus(error, 400)) {
    return <Alert tone="error">This realm has no such user.</Alert>
  }
  if (!data) {
    return <LoadFailed what="user" onRetry={() => void refetch()} />
  }
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono">{data.username}</span>
            {!data.enabled && <Badge variant="outline">Disabled</Badge>}
          </span>
        }
        description={data.email}
      />
      <SettingsSection
        title="Status"
        description="A disabled user cannot sign in, and their sessions and refresh tokens stop working."
      >
        <UserStatusSwitches realm={realm} user={data} />
      </SettingsSection>
      <SettingsSection
        title="Password"
        description="Sets a new password right away. The realm password policy applies."
      >
        <SetUserPasswordForm realm={realm} userId={data.id} />
      </SettingsSection>
      <SettingsSection
        title="Realm roles"
        description="Valid in the whole realm. New tokens carry the change; tokens already issued keep their roles until they expire."
      >
        <UserRolesEditor scope={{ realm }} userId={data.id} />
      </SettingsSection>
      <SettingsSection
        title="Client roles"
        description="Roles inside one client. Only that client sees them in its tokens."
      >
        <UserClientRoles realm={realm} userId={data.id} />
      </SettingsSection>
    </>
  )
}
