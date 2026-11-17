import {
  Link,
  Outlet,
  useParams,
  useRouteContext,
  useSearch,
} from '@tanstack/react-router'
import { ClientPage } from '@/pages/client'
import { ClientsPage } from '@/pages/clients'
import { NewClientPage } from '@/pages/new-client'
import { NewUserPage } from '@/pages/new-user'
import { RealmRolesPage } from '@/pages/realm-roles'
import { RealmSettingsPage } from '@/pages/realm-settings'
import { UserPage } from '@/pages/user'
import { UsersPage } from '@/pages/users'
import { AppShell } from '@/widgets/app-shell'
import { RealmGuard } from '@/widgets/realm-guard'

export function AppLayoutRoute() {
  const { user } = useRouteContext({ from: '__root__' })
  return (
    <AppShell username={user.username}>
      <Outlet />
    </AppShell>
  )
}

export function NotFound() {
  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Page not found</h1>
      <Link
        to="/realms"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Realms
      </Link>
    </div>
  )
}

export function RealmLayoutRoute() {
  const { realm } = useParams({ from: '/realms/$realm' })
  return (
    <RealmGuard realm={realm}>
      <Outlet />
    </RealmGuard>
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
