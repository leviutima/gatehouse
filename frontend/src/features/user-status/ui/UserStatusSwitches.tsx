import { Alert, Switch } from '@leviutima/ds'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUser, userQueryKey, usersQueryKey } from '@/entities/user'
import type { User, UserStatus } from '@/entities/user'
import { apiErrorCode, apiErrorMessage } from '@/shared/api'

interface UserStatusSwitchesProps {
  realm: string
  user: User
}

export function UserStatusSwitches({ realm, user }: UserStatusSwitchesProps) {
  const queryClient = useQueryClient()
  const update = useMutation({
    mutationFn: (changes: Partial<UserStatus>) => updateUser(realm, user.id, changes),
    onSuccess: (saved) => {
      queryClient.setQueryData(userQueryKey(realm, user.id), saved)
      return queryClient.invalidateQueries({
        queryKey: [...usersQueryKey(realm), 'page'],
      })
    },
  })

  const failure =
    apiErrorCode(update.error) === 'last_realm_admin'
      ? 'This is the last enabled admin of the realm, so it cannot be disabled.'
      : (apiErrorMessage(update.error) ?? 'The change could not be saved.')

  return (
    <div className="flex flex-col gap-3">
      <Switch
        label="Enabled"
        checked={user.enabled}
        disabled={update.isPending}
        onChange={(event) => update.mutate({ enabled: event.target.checked })}
      />
      <Switch
        label="Email verified"
        checked={user.emailVerified}
        disabled={update.isPending}
        onChange={(event) => update.mutate({ emailVerified: event.target.checked })}
      />
      {update.isError && <Alert tone="error">{failure}</Alert>}
    </div>
  )
}
