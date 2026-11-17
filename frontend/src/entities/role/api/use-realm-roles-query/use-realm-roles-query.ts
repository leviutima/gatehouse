import { useQuery } from '@tanstack/react-query'
import { listRealmRoles } from '../role-api/role-api.ts'

export function useRealmRolesQuery(realm: string) {
  return useQuery({
    queryKey: ['realms', realm, 'roles'],
    queryFn: () => listRealmRoles(realm),
  })
}
