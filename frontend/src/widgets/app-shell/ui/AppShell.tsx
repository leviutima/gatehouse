import { Button } from '@leviutima/ds'
import { useParams } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { env } from '@/shared/config'
import { CopyButton } from '@/shared/ui'
import { Breadcrumbs } from './Breadcrumbs.tsx'
import { Sidebar } from './Sidebar.tsx'

interface AppShellProps {
  username: string
  children: ReactNode
}

export function AppShell({ username, children }: AppShellProps) {
  const { realm } = useParams({ strict: false })
  const [menuOpen, setMenuOpen] = useState(false)
  const issuer = realm
    ? `${env.VITE_GATEHOUSE_ISSUER.replace(/\/+$/, '')}/realms/${realm}`
    : undefined

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-subtle md:block">
        <Sidebar realm={realm} username={username} onNavigate={() => undefined} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close the menu"
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-subtle shadow-lg">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Close the menu"
              className="absolute top-3 right-3"
              onClick={() => setMenuOpen(false)}
            >
              <X className="size-4" />
            </Button>
            <Sidebar realm={realm} username={username} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Open the menu"
            className="md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <Breadcrumbs />
          {issuer && (
            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <span className="text-xs text-muted-foreground">Issuer</span>
              <code className="rounded border border-border bg-subtle px-2 py-0.5 font-mono text-xs">
                {issuer}
              </code>
              <CopyButton value={issuer} label="Copy the issuer URL" />
            </div>
          )}
        </header>
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  )
}
