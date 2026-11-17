import { buttonVariants } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui'
import { UsersTable } from '@/widgets/users-table'

interface UsersPageProps {
  realm: string
  page: number
}

export function UsersPage({ realm, page }: UsersPageProps) {
  return (
    <>
      <PageHeader
        title="Users"
        description="People who sign in through this realm."
        actions={
          <Link
            to="/realms/$realm/users/new"
            params={{ realm }}
            className={buttonVariants({ size: 'sm' })}
          >
            New user
          </Link>
        }
      />
      <UsersTable realm={realm} page={page} />
    </>
  )
}
