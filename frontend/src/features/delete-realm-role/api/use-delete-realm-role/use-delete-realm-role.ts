import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteRealmRole, realmRolesQueryKey } from '@/entities/role'

export function useDeleteRealmRole(realm: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleName: string) => deleteRealmRole(realm, roleName),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: realmRolesQueryKey(realm) }),
  })
}
