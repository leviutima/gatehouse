import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRealmRole, realmRolesQueryKey } from '@/entities/role'
import type { CreateRealmRoleValues } from '../../model/create-realm-role-schema/create-realm-role.schema.ts'

export function useCreateRealmRole(realm: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, description }: CreateRealmRoleValues) =>
      createRealmRole(realm, {
        name,
        description: description.trim() || undefined,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: realmRolesQueryKey(realm) }),
  })
}
