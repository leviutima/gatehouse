import { buttonVariants } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { UsersTable } from '@/widgets/users-table'

interface UsersPageProps {
  realm: string
  page: number
}

export function UsersPage({ realm, page }: UsersPageProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          People who sign in through this realm.
        </p>
        <Link
          to="/realms/$realm/users/new"
          params={{ realm }}
          className={buttonVariants({ size: 'sm' })}
        >
          New user
        </Link>
      </div>
      <UsersTable realm={realm} page={page} />
    </section>
  )
}
