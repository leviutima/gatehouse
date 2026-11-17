import { CreateRoleForm } from '@/features/create-role'
import { PageHeader } from '@/shared/ui'
import { RolesTable } from '@/widgets/roles-table'

interface RealmRolesPageProps {
  realm: string
}

export function RealmRolesPage({ realm }: RealmRolesPageProps) {
  const scope = { realm }
  return (
    <>
      <PageHeader
        title="Realm roles"
        description={
          <>
            Roles that apply to the whole realm. They go in the{' '}
            <code className="font-mono">realm_access</code> claim of every user
            token.
          </>
        }
      />
      <CreateRoleForm scope={scope} />
      <RolesTable scope={scope} />
    </>
  )
}
