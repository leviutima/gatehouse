import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { z } from 'zod'
import { NewRealmPage } from '@/pages/new-realm'
import { RealmsPage } from '@/pages/realms'
import {
  ClientRoute,
  ClientsRoute,
  NewClientRoute,
  NewUserRoute,
  NotFound,
  RealmLayoutRoute,
  RealmRolesRoute,
  RealmSettingsRoute,
  UserRoute,
  UsersRoute,
} from './route-components.tsx'

const rootRoute = createRootRoute({ notFoundComponent: NotFound })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/realms', replace: true })
  },
})

const realmsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/realms',
  component: RealmsPage,
})

const newRealmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/realms/new',
  component: NewRealmPage,
})

const realmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/realms/$realm',
  component: RealmLayoutRoute,
})

const realmIndexRoute = createRoute({
  getParentRoute: () => realmRoute,
  path: '/',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/realms/$realm/roles',
      params: { realm: params.realm },
      replace: true,
    })
  },
})

const realmRolesRoute = createRoute({
  getParentRoute: () => realmRoute,
  path: 'roles',
  component: RealmRolesRoute,
})

const clientsRoute = createRoute({
  getParentRoute: () => realmRoute,
  path: 'clients',
})

const clientsIndexRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: '/',
  component: ClientsRoute,
})

const newClientRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: 'new',
  component: NewClientRoute,
})

const clientRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: '$clientId',
  component: ClientRoute,
})

const usersSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
})

const usersRoute = createRoute({
  getParentRoute: () => realmRoute,
  path: 'users',
})

const usersIndexRoute = createRoute({
  getParentRoute: () => usersRoute,
  path: '/',
  validateSearch: (search) => usersSearchSchema.parse(search),
  component: UsersRoute,
})

const newUserRoute = createRoute({
  getParentRoute: () => usersRoute,
  path: 'new',
  component: NewUserRoute,
})

const userRoute = createRoute({
  getParentRoute: () => usersRoute,
  path: '$userId',
  component: UserRoute,
})

const realmSettingsRoute = createRoute({
  getParentRoute: () => realmRoute,
  path: 'settings',
  component: RealmSettingsRoute,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  realmsRoute,
  newRealmRoute,
  realmRoute.addChildren([
    realmIndexRoute,
    realmRolesRoute,
    clientsRoute.addChildren([clientsIndexRoute, newClientRoute, clientRoute]),
    usersRoute.addChildren([usersIndexRoute, newUserRoute, userRoute]),
    realmSettingsRoute,
  ]),
])

export function createAppRouter() {
  return createRouter({ routeTree })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}
