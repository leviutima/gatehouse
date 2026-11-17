import type { ReactNode } from 'react'

interface SettingsSectionProps {
  title: string
  description?: ReactNode
  children: ReactNode
}

export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className="grid gap-4 border-b border-border py-8 first:pt-0 last:border-b-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
