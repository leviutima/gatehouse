import { buttonVariants } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { RealmsTable } from '@/widgets/realms-table'

export function RealmsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Realms</h1>
        <Link to="/realms/new" className={buttonVariants({ size: 'sm' })}>
          New realm
        </Link>
      </div>
      <RealmsTable />
    </main>
  )
}
