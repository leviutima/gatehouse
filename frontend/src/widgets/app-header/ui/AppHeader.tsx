import { SignOutButton } from '@/features/sign-out'

interface AppHeaderProps {
  username: string
}

export function AppHeader({ username }: AppHeaderProps) {
  return (
    <header className="flex items-center gap-4 border-b border-line bg-card px-6 py-3">
      <strong className="mr-auto">Gatehouse</strong>
      <span className="text-muted">{username}</span>
      <SignOutButton />
    </header>
  )
}
