import { useNavigate } from '@tanstack/react-router'
import { CreateRealmForm } from '@/features/create-realm'
import { PageHeader } from '@/shared/ui'

export function NewRealmPage() {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader title="New realm" />
      <CreateRealmForm
        onCreated={(realm) =>
          void navigate({ to: '/realms/$realm/roles', params: { realm: realm.name } })
        }
      />
    </>
  )
}
