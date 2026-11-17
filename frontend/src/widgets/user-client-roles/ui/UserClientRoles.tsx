import { Select } from '@leviutima/ds'
import { useState } from 'react'
import { useClientsQuery } from '@/entities/client'
import { UserRolesEditor } from '@/features/user-roles'

interface UserClientRolesProps {
  realm: string
  userId: string
}

export function UserClientRoles({ realm, userId }: UserClientRolesProps) {
  const clients = useClientsQuery(realm)
  const [clientId, setClientId] = useState('')

  if (!clients.data) {
    return (
      <p className="text-sm text-muted-foreground">
        {clients.isError ? 'The clients could not be loaded.' : 'Loading clients…'}
      </p>
    )
  }
  if (clients.data.length === 0) {
    return <p className="text-sm text-muted-foreground">This realm has no clients.</p>
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-60">
        <Select
          aria-label="Client"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
        >
          <option value="">Choose a client…</option>
          {clients.data.map((client) => (
            <option key={client.id} value={client.clientId}>
              {client.clientId}
            </option>
          ))}
        </Select>
      </div>
      {clientId && (
        <UserRolesEditor key={clientId} scope={{ realm, clientId }} userId={userId} />
      )}
    </div>
  )
}
