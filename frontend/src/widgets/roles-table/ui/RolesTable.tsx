import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@leviutima/ds'
import { useRolesQuery } from '@/entities/role'
import type { RoleScope } from '@/entities/role'
import { SessionExpiredError } from '@/entities/session'
import { DeleteRoleButton } from '@/features/delete-role'
import { LoadFailed } from '@/shared/ui'

interface RolesTableProps {
  scope: RoleScope
}

export function RolesTable({ scope }: RolesTableProps) {
  const { data, error, isFetching, refetch } = useRolesQuery(scope)
  const isRealmScope = scope.clientId === undefined

  if ((isFetching && !data) || error instanceof SessionExpiredError) {
    return <p className="text-sm text-muted-foreground">Loading roles…</p>
  }
  if (!data) {
    return <LoadFailed what="roles" onRetry={() => void refetch()} />
  }
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No roles yet.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/3">Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((role) => (
          <TableRow key={role.id}>
            <TableCell className="font-mono">{role.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {role.description ?? '—'}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              {!(isRealmScope && role.name === 'admin') && (
                <DeleteRoleButton scope={scope} roleName={role.name} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
