import { Alert } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SessionExpiredError } from '@/entities/session'
import { useUserQuery } from '@/entities/user'
import { SetUserPasswordForm } from '@/features/set-user-password'
import { UserRolesEditor } from '@/features/user-roles'
import { UserStatusSwitches } from '@/features/user-status'
import { hasHttpStatus } from '@/shared/api'
import { LoadFailed } from '@/shared/ui'
import { UserClientRoles } from '@/widgets/user-client-roles'

interface UserPageProps {
  realm: string
  userId: string
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

export function UserPage({ realm, userId }: UserPageProps) {
  const { data, error, isFetching, refetch } = useUserQuery(realm, userId)

  const back = (
    <Link
      to="/realms/$realm/users"
      params={{ realm }}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      ← Users
    </Link>
  )

  if ((isFetching && !data) || error instanceof SessionExpiredError) {
    return <p className="text-sm text-muted-foreground">Loading user…</p>
  }
  if (hasHttpStatus(error, 404) || hasHttpStatus(error, 400)) {
    return (
      <div className="flex flex-col items-start gap-4">
        {back}
        <Alert tone="error">This realm has no such user.</Alert>
      </div>
    )
  }
  if (!data) {
    return <LoadFailed what="user" onRetry={() => void refetch()} />
  }
  return (
    <div className="flex flex-col gap-8">
      <div>
        {back}
        <h2 className="mt-2 text-lg font-semibold">
          <span className="font-mono">{data.username}</span>
          <span className="ml-2 font-normal text-muted-foreground">{data.email}</span>
        </h2>
      </div>
      <Section title="Status">
        <UserStatusSwitches realm={realm} user={data} />
      </Section>
      <Section title="Password">
        <SetUserPasswordForm realm={realm} userId={data.id} />
      </Section>
      <Section title="Realm roles">
        <UserRolesEditor scope={{ realm }} userId={data.id} />
      </Section>
      <Section title="Client roles">
        <UserClientRoles realm={realm} userId={data.id} />
      </Section>
    </div>
  )
}
