import { Link, useNavigate } from '@tanstack/react-router'
import { CreateRealmForm } from '@/features/create-realm'

export function NewRealmPage() {
  const navigate = useNavigate()
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        to="/realms"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Realms
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">New realm</h1>
      <CreateRealmForm
        onCreated={(realm) =>
          void navigate({ to: '/realms/$realm/roles', params: { realm: realm.name } })
        }
      />
    </main>
  )
}
