import { Link, useParams } from '@tanstack/react-router'
import { RealmRolesPage } from '@/pages/realm-roles'

export function NotFound() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-2 text-xl font-semibold">Page not found</h1>
      <Link
        to="/realms"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Realms
      </Link>
    </main>
  )
}

export function RealmRolesRoute() {
  const { realm } = useParams({ from: '/realms/$realm/roles' })
  return <RealmRolesPage realm={realm} />
}
