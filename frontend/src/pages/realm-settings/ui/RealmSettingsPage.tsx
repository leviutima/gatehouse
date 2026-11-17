import { useRealmQuery } from '@/entities/realm'
import { RealmSettingsForm } from '@/features/realm-settings'

interface RealmSettingsPageProps {
  realm: string
}

export function RealmSettingsPage({ realm }: RealmSettingsPageProps) {
  const { data } = useRealmQuery(realm)
  if (!data) {
    return null
  }
  return (
    <section>
      <p className="mb-4 text-sm text-muted-foreground">
        Users of this realm sign in with{' '}
        {data.loginIdentifier === 'USERNAME_OR_EMAIL'
          ? 'their username or email'
          : data.loginIdentifier === 'EMAIL'
            ? 'their email'
            : 'their username'}
        . This cannot change after the realm is created.
      </p>
      <RealmSettingsForm key={data.id} realm={data} />
    </section>
  )
}
