import { useQuery } from '@tanstack/react-query'
import { listRealmRoles } from '../role-api/role-api.ts'

export function realmRolesQueryKey(realm: string) {
  return ['realms', realm, 'roles'] as const
}

export function useRealmRolesQuery(realm: string) {
  return useQuery({
    queryKey: realmRolesQueryKey(realm),
    queryFn: () => listRealmRoles(realm),
  })
}
