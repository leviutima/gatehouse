import {
  Alert,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@leviutima/ds'
import { useRealmsQuery } from '@/entities/realm'
import { SessionExpiredError } from '@/entities/session'
import { hasHttpStatus } from '@/shared/api'

export function RealmsTable() {
  const { data, error, isFetching, refetch } = useRealmsQuery()

  if (isFetching || error instanceof SessionExpiredError) {
    return <p className="text-muted-foreground">Loading realms…</p>
  }
  if (hasHttpStatus(error, 403)) {
    return (
      <Alert tone="error">
        This account is not an administrator of the master realm, so it cannot
        list realms.
      </Alert>
    )
  }
  if (!data) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert tone="error" className="w-full">
          The realms could not be loaded.
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
          <TableHead>Name</TableHead>
          <TableHead>Display name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((realm) => (
          <TableRow key={realm.id}>
            <TableCell className="font-mono">{realm.name}</TableCell>
            <TableCell>{realm.displayName}</TableCell>
            <TableCell>
              <Badge variant={realm.enabled ? 'solid' : 'outline'}>
                {realm.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
