import type { ReactNode } from 'react'

interface FormFooterProps {
  children: ReactNode
}

export function FormFooter({ children }: FormFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-8 lg:pl-[calc(18rem+2.5rem)]">
      {children}
    </div>
  )
}
