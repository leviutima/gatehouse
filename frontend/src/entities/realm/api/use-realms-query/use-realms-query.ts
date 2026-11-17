import { useQuery } from '@tanstack/react-query'
import { getRealm, listRealms } from '../realm-api/realm-api.ts'

export const realmsQueryKey = ['realms'] as const

export function realmQueryKey(name: string) {
  return ['realms', name, 'details'] as const
}

export function useRealmsQuery() {
  return useQuery({ queryKey: realmsQueryKey, queryFn: listRealms })
}

export function useRealmQuery(name: string) {
  return useQuery({
    queryKey: realmQueryKey(name),
    queryFn: () => getRealm(name),
  })
}
