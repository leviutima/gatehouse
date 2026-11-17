import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { useClientsQuery } from '@/entities/client'
import { SessionExpiredError } from '@/entities/session'
import { LoadFailed } from '@/shared/ui'

interface ClientsTableProps {
  realm: string
}

export function ClientsTable({ realm }: ClientsTableProps) {
  const { data, error, isFetching, refetch } = useClientsQuery(realm)

  if ((isFetching && !data) || error instanceof SessionExpiredError) {
    return <p className="text-sm text-muted-foreground">Loading clients…</p>
  }
  if (!data) {
    return <LoadFailed what="clients" onRetry={() => void refetch()} />
  }
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No clients yet.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/3">Client id</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-mono">
              <Link
                to="/realms/$realm/clients/$clientId"
                params={{ realm, clientId: client.clientId }}
                className="underline-offset-4 hover:underline"
              >
                {client.clientId}
              </Link>
            </TableCell>
            <TableCell>{client.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {client.type === 'PUBLIC' ? 'Public' : 'Confidential'}
            </TableCell>
            <TableCell>
              <Badge variant={client.enabled ? 'solid' : 'outline'}>
                {client.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
