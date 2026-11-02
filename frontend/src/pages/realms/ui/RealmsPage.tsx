import { RealmsTable } from '@/widgets/realms-table'

export function RealmsPage() {
  return (
    <main className="mx-auto max-w-252 px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Realms</h1>
      <RealmsTable />
    </main>
  )
}
