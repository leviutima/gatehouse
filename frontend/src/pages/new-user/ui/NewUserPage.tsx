import { useNavigate } from '@tanstack/react-router'
import { useRealmQuery } from '@/entities/realm'
import { CreateUserForm } from '@/features/create-user'

interface NewUserPageProps {
  realm: string
}

export function NewUserPage({ realm }: NewUserPageProps) {
  const navigate = useNavigate()
  const { data } = useRealmQuery(realm)

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">New user</h2>
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
    </section>
  )
}
