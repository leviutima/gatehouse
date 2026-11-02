import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { SessionContext } from '@/entities/session'
import { queryClient } from './query-client.ts'
import { session } from './session.ts'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SessionContext value={session}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionContext>
  )
}
