import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteRole, rolesQueryKey } from '@/entities/role'
import type { RoleScope } from '@/entities/role'

export function useDeleteRole(scope: RoleScope) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleName: string) => deleteRole(scope, roleName),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: rolesQueryKey(scope) }),
  })
}
