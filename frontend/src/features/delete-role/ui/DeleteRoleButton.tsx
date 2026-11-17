import type { RoleScope } from '@/entities/role'
import { ConfirmAction } from '@/shared/ui'
import { useDeleteRole } from '../api/use-delete-role/use-delete-role.ts'

interface DeleteRoleButtonProps {
  scope: RoleScope
  roleName: string
}

export function DeleteRoleButton({ scope, roleName }: DeleteRoleButtonProps) {
  const deleteRole = useDeleteRole(scope)
  return (
    <ConfirmAction
      label="Delete"
      question={`Delete ${roleName}?`}
      failure="Could not delete."
      status={deleteRole}
      onConfirm={() => deleteRole.mutate(roleName)}
    />
  )
}
