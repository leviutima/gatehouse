import { useQuery } from '@tanstack/react-query'
import { listRealms } from './realm-api.ts'

export function useRealmsQuery() {
  return useQuery({ queryKey: ['realms'], queryFn: listRealms })
}
