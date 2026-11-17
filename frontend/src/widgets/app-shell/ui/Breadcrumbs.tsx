import { Link, useMatches } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'

export function Breadcrumbs() {
  const crumbs = useMatches()
    .filter((match) => match.staticData.crumb)
    .map((match) => ({
      href: match.pathname,
      label: match.staticData.crumb!(match.params as Record<string, string>),
    }))

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <Fragment key={crumb.href}>
              {index > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <li className="min-w-0 truncate">
                {last ? (
                  <span aria-current="page" className="font-medium">
                    {crumb.label}
                  </span>
                ) : (
                  <Link to={crumb.href} className="text-muted-foreground hover:text-foreground">
                    {crumb.label}
                  </Link>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
