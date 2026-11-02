import { SignOutButton } from '@/features/sign-out'

interface AppHeaderProps {
  username: string
}

export function AppHeader({ username }: AppHeaderProps) {
  return (
    <header className="flex items-center gap-4 border-b border-foreground bg-background px-6 py-3">
      <strong className="mr-auto font-semibold">Gatehouse</strong>
      <span className="text-sm text-muted-foreground">{username}</span>
      <SignOutButton />
    </header>
  )
}
