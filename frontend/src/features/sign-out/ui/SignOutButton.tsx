import { Button } from '@leviutima/ds'
import { useSession } from '@/entities/session'

export function SignOutButton() {
  const session = useSession()

  return (
    <Button variant="ghost" size="sm" onClick={() => void session.logout()}>
      Sign out
    </Button>
  )
}
