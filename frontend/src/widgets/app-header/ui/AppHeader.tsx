import { SignOutButton } from '@/features/sign-out'

interface AppHeaderProps {
  username: string
}

export function AppHeader({ username }: AppHeaderProps) {
  return (
    <header className="topbar">
      <strong>Gatehouse</strong>
      <span className="muted">{username}</span>
      <SignOutButton />
    </header>
  )
}
