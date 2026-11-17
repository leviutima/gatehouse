import { Alert, Button, Select } from '@leviutima/ds'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  assignUserRole,
  unassignUserRole,
  userRolesQueryKey,
  useRolesQuery,
  useUserRolesQuery,
} from '@/entities/role'
import type { RoleScope } from '@/entities/role'
import { apiErrorCode, apiErrorMessage } from '@/shared/api'

interface UserRolesEditorProps {
  scope: RoleScope
  userId: string
}

export function UserRolesEditor({ scope, userId }: UserRolesEditorProps) {
  const queryClient = useQueryClient()
  const available = useRolesQuery(scope)
  const assigned = useUserRolesQuery(scope, userId)
  const [picked, setPicked] = useState('')

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: userRolesQueryKey(scope, userId) })
  const assign = useMutation({
    mutationFn: (roleName: string) => assignUserRole(scope, userId, roleName),
    onSuccess: () => {
      setPicked('')
      return refresh()
    },
  })
  const unassign = useMutation({
    mutationFn: (roleName: string) => unassignUserRole(scope, userId, roleName),
    onSuccess: refresh,
  })

  if (!available.data || !assigned.data) {
    return (
      <p className="text-sm text-muted-foreground">
        {available.isError || assigned.isError ? 'The roles could not be loaded.' : 'Loading roles…'}
      </p>
    )
  }

  const assignedNames = new Set(assigned.data.map(({ name }) => name))
  const assignable = available.data.filter(({ name }) => !assignedNames.has(name))
  const error = assign.error ?? unassign.error
  const failure =
    apiErrorCode(error) === 'last_realm_admin'
      ? 'This is the last enabled admin of the realm, so the admin role cannot be taken away.'
      : (apiErrorMessage(error) ?? 'The change could not be saved.')

  return (
    <div className="flex flex-col gap-3">
      {assigned.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No roles.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {assigned.data.map((role) => (
            <li
              key={role.id}
              className="flex items-center gap-1 rounded border border-border py-0.5 pr-1 pl-2 font-mono text-sm"
            >
              {role.name}
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Take ${role.name} away`}
                disabled={unassign.isPending}
                onClick={() => {
                  assign.reset()
                  unassign.mutate(role.name)
                }}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}
      {assignable.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-60">
            <Select
              aria-label="Role to give"
              value={picked}
              onChange={(event) => setPicked(event.target.value)}
            >
              <option value="">Choose a role…</option>
              {assignable.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!picked}
            loading={assign.isPending}
            onClick={() => {
              unassign.reset()
              assign.mutate(picked)
            }}
          >
            Give role
          </Button>
        </div>
      )}
      {error && <Alert tone="error">{failure}</Alert>}
    </div>
  )
}
