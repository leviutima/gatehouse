import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRole, rolesQueryKey } from '@/entities/role'
import type { RoleScope } from '@/entities/role'
import type { CreateRoleValues } from '../../model/create-role-schema/create-role.schema.ts'

export function useCreateRole(scope: RoleScope) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, description }: CreateRoleValues) =>
      createRole(scope, {
        name,
        description: description.trim() || undefined,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: rolesQueryKey(scope) }),
  })
}
