import { createContext, useContext } from 'react'
import type { AuthSession } from '../auth-session/auth-session.ts'

export const SessionContext = createContext<AuthSession | null>(null)

export function useSession(): AuthSession {
  const session = useContext(SessionContext)
  if (!session) {
    throw new Error('useSession must be used inside SessionContext')
  }
  return session
}
