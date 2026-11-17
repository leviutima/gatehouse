import { Link, Outlet, useParams, useSearch } from '@tanstack/react-router'
import { ClientPage } from '@/pages/client'
import { ClientsPage } from '@/pages/clients'
import { NewClientPage } from '@/pages/new-client'
import { NewUserPage } from '@/pages/new-user'
import { RealmRolesPage } from '@/pages/realm-roles'
import { RealmSettingsPage } from '@/pages/realm-settings'
import { UserPage } from '@/pages/user'
import { UsersPage } from '@/pages/users'
import { RealmShell } from '@/widgets/realm-shell'

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

export function RealmLayoutRoute() {
  const { realm } = useParams({ from: '/realms/$realm' })
  return (
    <RealmShell realm={realm}>
      <Outlet />
    </RealmShell>
  )
}

export function RealmRolesRoute() {
  const { realm } = useParams({ from: '/realms/$realm/roles' })
  return <RealmRolesPage realm={realm} />
}

export function ClientsRoute() {
  const { realm } = useParams({ from: '/realms/$realm/clients/' })
  return <ClientsPage realm={realm} />
}

export function NewClientRoute() {
  const { realm } = useParams({ from: '/realms/$realm/clients/new' })
  return <NewClientPage realm={realm} />
}

export function ClientRoute() {
  const { realm, clientId } = useParams({
    from: '/realms/$realm/clients/$clientId',
  })
  return <ClientPage key={clientId} realm={realm} clientId={clientId} />
}

export function UsersRoute() {
  const { realm } = useParams({ from: '/realms/$realm/users/' })
  const { page } = useSearch({ from: '/realms/$realm/users/' })
  return <UsersPage realm={realm} page={page ?? 1} />
}

export function NewUserRoute() {
  const { realm } = useParams({ from: '/realms/$realm/users/new' })
  return <NewUserPage realm={realm} />
}

export function UserRoute() {
  const { realm, userId } = useParams({ from: '/realms/$realm/users/$userId' })
  return <UserPage key={userId} realm={realm} userId={userId} />
}

export function RealmSettingsRoute() {
  const { realm } = useParams({ from: '/realms/$realm/settings' })
  return <RealmSettingsPage realm={realm} />
}
