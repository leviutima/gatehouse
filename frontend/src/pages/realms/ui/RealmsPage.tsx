import { RealmsTable } from '@/widgets/realms-table'

export function RealmsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Realms</h1>
      <RealmsTable />
    </main>
  )
}
