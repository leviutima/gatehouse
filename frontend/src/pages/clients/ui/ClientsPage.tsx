import { buttonVariants } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { ClientsTable } from '@/widgets/clients-table'

interface ClientsPageProps {
  realm: string
}

export function ClientsPage({ realm }: ClientsPageProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Applications that sign users in or call APIs through this realm.
        </p>
        <Link
          to="/realms/$realm/clients/new"
          params={{ realm }}
          className={buttonVariants({ size: 'sm' })}
        >
          New client
        </Link>
      </div>
      <ClientsTable realm={realm} />
    </section>
  )
}
