import { Link } from '@tanstack/react-router'
import { RealmRolesTable } from '@/widgets/realm-roles-table'

interface RealmRolesPageProps {
  realm: string
}

export function RealmRolesPage({ realm }: RealmRolesPageProps) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        to="/realms"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Realms
      </Link>
      <h1 className="mt-2 mb-1 font-mono text-2xl font-semibold">{realm}</h1>
      <h2 className="mb-4 text-sm text-muted-foreground">Realm roles</h2>
      <RealmRolesTable realm={realm} />
    </main>
  )
}
