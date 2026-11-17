import { CreateRoleForm } from '@/features/create-role'
import { RolesTable } from '@/widgets/roles-table'

interface RealmRolesPageProps {
  realm: string
}

export function RealmRolesPage({ realm }: RealmRolesPageProps) {
  const scope = { realm }
  return (
    <section>
      <p className="mb-4 text-sm text-muted-foreground">
        Realm roles apply to the whole realm and go in the{' '}
        <code className="font-mono">realm_access</code> claim of every token.
      </p>
      <CreateRoleForm scope={scope} />
      <RolesTable scope={scope} />
    </section>
  )
}
