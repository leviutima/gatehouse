import { buttonVariants } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui'
import { RealmsTable } from '@/widgets/realms-table'

export function RealmsPage() {
  return (
    <>
      <PageHeader
        title="Realms"
        description="Each realm has its own users, clients, roles and signing keys. Tokens from one realm are never accepted by another."
        actions={
          <Link to="/realms/new" className={buttonVariants({ size: 'sm' })}>
            New realm
          </Link>
        }
      />
      <RealmsTable />
    </>
  )
}
