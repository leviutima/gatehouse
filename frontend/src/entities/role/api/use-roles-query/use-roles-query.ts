import { useQuery } from '@tanstack/react-query'
import { scopeKey } from '../../model/role-scope/role-scope.ts'
import type { RoleScope } from '../../model/role-scope/role-scope.ts'
import { listRoles, listUserRoles } from '../role-api/role-api.ts'

export function rolesQueryKey(scope: RoleScope) {
  return scopeKey(scope)
}

export function userRolesQueryKey(scope: RoleScope, userId: string) {
  return [...scopeKey(scope), 'users', userId] as const
}

export function useRolesQuery(scope: RoleScope) {
  return useQuery({
    queryKey: rolesQueryKey(scope),
    queryFn: () => listRoles(scope),
  })
}

export function useUserRolesQuery(scope: RoleScope, userId: string) {
  return useQuery({
    queryKey: userRolesQueryKey(scope, userId),
    queryFn: () => listUserRoles(scope, userId),
  })
}
