import { useQuery } from '@tanstack/react-query'
import { getClient, listClients } from '../client-api/client-api.ts'

export function clientsQueryKey(realm: string) {
  return ['realms', realm, 'clients'] as const
}

export function clientQueryKey(realm: string, clientId: string) {
  return ['realms', realm, 'clients', clientId, 'details'] as const
}

export function useClientsQuery(realm: string) {
  return useQuery({
    queryKey: clientsQueryKey(realm),
    queryFn: () => listClients(realm),
  })
}

export function useClientQuery(realm: string, clientId: string) {
  return useQuery({
    queryKey: clientQueryKey(realm, clientId),
    queryFn: () => getClient(realm, clientId),
  })
}
