import { Link } from '@tanstack/react-router'
import { Boxes, Building2, KeyRound, Settings, ShieldCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { SignOutButton } from '@/features/sign-out'
import { RealmSwitcher } from './RealmSwitcher.tsx'

interface SidebarProps {
  realm: string | undefined
  username: string
  onNavigate(): void
}

const realmNav = [
  { to: '/realms/$realm/roles', label: 'Roles', icon: KeyRound },
  { to: '/realms/$realm/clients', label: 'Clients', icon: Boxes },
  { to: '/realms/$realm/users', label: 'Users', icon: Users },
  { to: '/realms/$realm/settings', label: 'Settings', icon: Settings },
] as const

const itemClass =
  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors'
const activeClass = 'bg-background font-medium text-foreground shadow-xs ring-1 ring-border'
const inactiveClass = 'text-muted-foreground hover:bg-subtle-hover hover:text-foreground'

function NavLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <>
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      {children}
    </>
  )
}

export function Sidebar({ realm, username, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <Link
        to="/realms"
        onClick={onNavigate}
        className="flex items-center gap-2 px-1.5 text-sm font-semibold"
      >
        <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
          <ShieldCheck className="size-4" strokeWidth={2} />
        </span>
        Gatehouse
      </Link>

      <RealmSwitcher realm={realm} />

      {realm && (
        <nav aria-label="Realm" className="flex flex-col gap-0.5">
          {realmNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              params={{ realm }}
              onClick={onNavigate}
              className={itemClass}
              activeProps={{ className: activeClass }}
              inactiveProps={{ className: inactiveClass }}
            >
              <NavLabel icon={item.icon}>{item.label}</NavLabel>
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
        <Link
          to="/realms"
          activeOptions={{ exact: true }}
          onClick={onNavigate}
          className={itemClass}
          activeProps={{ className: activeClass }}
          inactiveProps={{ className: inactiveClass }}
        >
          <NavLabel icon={Building2}>All realms</NavLabel>
        </Link>
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-subtle-hover text-xs font-medium uppercase">
              {username.charAt(0)}
            </span>
            <span className="truncate">{username}</span>
          </span>
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
