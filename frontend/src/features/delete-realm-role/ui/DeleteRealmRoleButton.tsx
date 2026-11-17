import { Button } from '@leviutima/ds'
import { useState } from 'react'
import { useDeleteRealmRole } from '../api/use-delete-realm-role/use-delete-realm-role.ts'

interface DeleteRealmRoleButtonProps {
  realm: string
  roleName: string
}

export function DeleteRealmRoleButton({
  realm,
  roleName,
}: DeleteRealmRoleButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const deleteRole = useDeleteRealmRole(realm)

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    )
  }
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-sm text-muted-foreground" role="status">
        {deleteRole.isError ? 'Could not delete.' : `Delete ${roleName}?`}
      </span>
      <Button
        variant="secondary"
        size="sm"
        loading={deleteRole.isPending}
        onClick={() => deleteRole.mutate(roleName)}
      >
        Confirm
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={deleteRole.isPending}
        onClick={() => {
          deleteRole.reset()
          setConfirming(false)
        }}
      >
        Cancel
      </Button>
    </div>
  )
}
