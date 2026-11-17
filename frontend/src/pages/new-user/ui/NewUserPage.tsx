import { useNavigate } from '@tanstack/react-router'
import { useRealmQuery } from '@/entities/realm'
import { CreateUserForm } from '@/features/create-user'
import { PageHeader } from '@/shared/ui'

interface NewUserPageProps {
  realm: string
}

export function NewUserPage({ realm }: NewUserPageProps) {
  const navigate = useNavigate()
  const { data } = useRealmQuery(realm)

  return (
    <>
      <PageHeader title="New user" />
      {data && (
        <CreateUserForm
          realm={realm}
          askUsername={data.loginIdentifier !== 'EMAIL'}
          onCreated={(user) =>
            void navigate({
              to: '/realms/$realm/users/$userId',
              params: { realm, userId: user.id },
            })
          }
        />
      )}
    </>
  )
}
