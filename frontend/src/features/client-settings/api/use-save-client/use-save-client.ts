import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  clientQueryKey,
  clientsQueryKey,
  createClient,
  updateClient,
} from '@/entities/client'
import type { ClientFormValues } from '../../model/client-form-schema/client-form.schema.ts'
import {
  toClientSettings,
  toNewClient,
} from '../../model/client-form-schema/client-form.schema.ts'

export function useCreateClient(realm: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ClientFormValues) =>
      createClient(realm, toNewClient(values)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: clientsQueryKey(realm) }),
  })
}

export function useUpdateClient(realm: string, clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ClientFormValues) =>
      updateClient(realm, clientId, toClientSettings(values)),
    onSuccess: (client) => {
      queryClient.setQueryData(clientQueryKey(realm, clientId), client)
      return queryClient.invalidateQueries({
        queryKey: clientsQueryKey(realm),
        exact: true,
      })
    },
  })
}
