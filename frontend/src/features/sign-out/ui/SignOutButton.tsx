import { useSession } from '@/entities/session'

export function SignOutButton() {
  const session = useSession()

  return (
    <button type="button" onClick={() => void session.logout()}>
      Sign out
    </button>
  )
}
