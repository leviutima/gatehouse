import { useSession } from '@/entities/session'
import { Button } from '@/shared/ui'

export function SignOutButton() {
  const session = useSession()

  return <Button onClick={() => void session.logout()}>Sign out</Button>
}
