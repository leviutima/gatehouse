import { SignOutButton } from '@/features/sign-out'

interface AppHeaderProps {
  username: string
}

export function AppHeader({ username }: AppHeaderProps) {
  return (
    <header className="flex h-12 items-center gap-3 border-b border-border bg-background px-4">
      <strong className="mr-auto text-sm font-semibold">Gatehouse</strong>
      <span className="text-sm text-muted-foreground">{username}</span>
      <SignOutButton />
    </header>
  )
}
