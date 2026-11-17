import { useRealmQuery } from '@/entities/realm'
import { RealmSettingsForm } from '@/features/realm-settings'
import { PageHeader } from '@/shared/ui'

interface RealmSettingsPageProps {
  realm: string
}

const loginLabels = {
  USERNAME_OR_EMAIL: 'their username or email',
  EMAIL: 'their email',
  USERNAME: 'their username',
} as const

export function RealmSettingsPage({ realm }: RealmSettingsPageProps) {
  const { data } = useRealmQuery(realm)
  if (!data) {
    return null
  }
  return (
    <>
      <PageHeader
        title="Settings"
        description={`Users of this realm sign in with ${loginLabels[data.loginIdentifier]}. This was set when the realm was created and cannot change.`}
      />
      <RealmSettingsForm key={data.id} realm={data} />
    </>
  )
}
