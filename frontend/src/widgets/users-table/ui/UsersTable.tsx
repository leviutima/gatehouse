import {
  Badge,
  buttonVariants,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { SessionExpiredError } from '@/entities/session'
import { useUsersQuery } from '@/entities/user'
import { LoadFailed } from '@/shared/ui'

const PAGE_SIZE = 50

interface UsersTableProps {
  realm: string
  page: number
}

export function UsersTable({ realm, page }: UsersTableProps) {
  const { data, error, isFetching, refetch } = useUsersQuery(realm, {
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE + 1,
  })

  if ((isFetching && !data) || error instanceof SessionExpiredError) {
    return <p className="text-sm text-muted-foreground">Loading users…</p>
  }
  if (!data) {
    return <LoadFailed what="users" onRetry={() => void refetch()} />
  }
  if (data.length === 0 && page === 1) {
    return <p className="text-sm text-muted-foreground">No users yet.</p>
  }

  const users = data.slice(0, PAGE_SIZE)
  const hasNext = data.length > PAGE_SIZE

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-mono">
                <Link
                  to="/realms/$realm/users/$userId"
                  params={{ realm, userId: user.id }}
                  className="underline-offset-4 hover:underline"
                >
                  {user.username}
                </Link>
              </TableCell>
              <TableCell>
                {user.email}
                {!user.emailVerified && (
                  <span className="ml-2 text-xs text-muted-foreground">unverified</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={user.enabled ? 'solid' : 'outline'}>
                  {user.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {(page > 1 || hasNext) && (
        <nav className="flex items-center gap-3 text-sm" aria-label="Pages">
          {page > 1 && (
            <Link
              to="/realms/$realm/users"
              params={{ realm }}
              search={{ page: page - 1 }}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              Previous
            </Link>
          )}
          <span className="text-muted-foreground">Page {page}</span>
          {hasNext && (
            <Link
              to="/realms/$realm/users"
              params={{ realm }}
              search={{ page: page + 1 }}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
