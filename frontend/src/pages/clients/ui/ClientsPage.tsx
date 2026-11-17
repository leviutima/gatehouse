import { buttonVariants } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui'
import { ClientsTable } from '@/widgets/clients-table'

interface ClientsPageProps {
  realm: string
}

export function ClientsPage({ realm }: ClientsPageProps) {
  return (
    <>
      <PageHeader
        title="Clients"
        description="Applications that sign users in or call APIs through this realm."
        actions={
          <Link
            to="/realms/$realm/clients/new"
            params={{ realm }}
            className={buttonVariants({ size: 'sm' })}
          >
            New client
          </Link>
        }
      />
      <ClientsTable realm={realm} />
    </>
  )
}
