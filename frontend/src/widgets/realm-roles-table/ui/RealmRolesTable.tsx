import {
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@leviutima/ds'
import { useRealmRolesQuery } from '@/entities/role'
import { SessionExpiredError } from '@/entities/session'
import { DeleteRealmRoleButton } from '@/features/delete-realm-role'
import { hasHttpStatus } from '@/shared/api'

interface RealmRolesTableProps {
  realm: string
}

export function RealmRolesTable({ realm }: RealmRolesTableProps) {
  const { data, error, isFetching, refetch } = useRealmRolesQuery(realm)

  if ((isFetching && !data) || error instanceof SessionExpiredError) {
    return <p className="text-sm text-muted-foreground">Loading roles…</p>
  }
  if (hasHttpStatus(error, 404)) {
    return <Alert tone="error">There is no realm called {realm}.</Alert>
  }
  if (!data) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert tone="error" className="w-full">
          The roles could not be loaded.
        </Alert>
        <Button variant="secondary" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    )
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
              {role.name !== 'admin' && (
                <DeleteRealmRoleButton realm={realm} roleName={role.name} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
