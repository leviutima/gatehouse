import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { z } from 'zod'
import type { SessionUser } from '@/entities/session'
import { NewRealmPage } from '@/pages/new-realm'
import { RealmsPage } from '@/pages/realms'
import {
  AppLayoutRoute,
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

export interface RouterContext {
  user: SessionUser
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: AppLayoutRoute,
  notFoundComponent: NotFound,
})

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
  staticData: { crumb: () => 'Realms' },
})

const realmsIndexRoute = createRoute({
  getParentRoute: () => realmsRoute,
  path: '/',
  component: RealmsPage,
})

const newRealmRoute = createRoute({
  getParentRoute: () => realmsRoute,
  path: 'new',
  staticData: { crumb: () => 'New realm' },
  component: NewRealmPage,
})

const realmRoute = createRoute({
  getParentRoute: () => realmsRoute,
  path: '$realm',
  staticData: { crumb: (params) => params.realm },
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
  staticData: { crumb: () => 'Roles' },
  component: RealmRolesRoute,
})

const clientsRoute = createRoute({
  getParentRoute: () => realmRoute,
  path: 'clients',
  staticData: { crumb: () => 'Clients' },
})

const clientsIndexRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: '/',
  component: ClientsRoute,
})

const newClientRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: 'new',
  staticData: { crumb: () => 'New client' },
  component: NewClientRoute,
})

const clientRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: '$clientId',
  staticData: { crumb: (params) => params.clientId },
  component: ClientRoute,
})

const usersSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
})

const usersRoute = createRoute({
  getParentRoute: () => realmRoute,
  path: 'users',
  staticData: { crumb: () => 'Users' },
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
  staticData: { crumb: () => 'New user' },
  component: NewUserRoute,
})

const userRoute = createRoute({
  getParentRoute: () => usersRoute,
  path: '$userId',
  staticData: { crumb: () => 'User' },
  component: UserRoute,
})

const realmSettingsRoute = createRoute({
  getParentRoute: () => realmRoute,
  path: 'settings',
  staticData: { crumb: () => 'Settings' },
  component: RealmSettingsRoute,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  realmsRoute.addChildren([
    realmsIndexRoute,
    newRealmRoute,
    realmRoute.addChildren([
      realmIndexRoute,
      realmRolesRoute,
      clientsRoute.addChildren([clientsIndexRoute, newClientRoute, clientRoute]),
      usersRoute.addChildren([usersIndexRoute, newUserRoute, userRoute]),
      realmSettingsRoute,
    ]),
  ]),
])

export function createAppRouter(user: SessionUser) {
  return createRouter({ routeTree, context: { user } })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }

  interface StaticDataRouteOption {
    crumb?: (params: Record<string, string>) => string
  }
}
