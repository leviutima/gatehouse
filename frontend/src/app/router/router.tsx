import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { RealmsPage } from '@/pages/realms'
import { NotFound, RealmRolesRoute } from './route-components.tsx'

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

const realmRolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/realms/$realm/roles',
  component: RealmRolesRoute,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  realmsRoute,
  realmRolesRoute,
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
