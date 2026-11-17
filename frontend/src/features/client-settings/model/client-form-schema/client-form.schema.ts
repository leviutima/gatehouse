import { z } from 'zod'
import { clientTypes, grantTypes } from '@/entities/client'
import type { Client, ClientSettings, NewClient } from '@/entities/client'
import { fromLines, toLines } from '@/shared/lib/lines'

export const clientFormSchema = z.object({
  clientId: z.string().trim().min(1, 'Enter a client id.'),
  name: z.string().trim().min(1, 'Enter a name.'),
  type: z.enum(clientTypes),
  grantTypes: z.array(z.enum(grantTypes)).min(1, 'Pick at least one grant.'),
  redirectUris: z.string(),
  postLogoutRedirectUris: z.string(),
  webOrigins: z.string(),
  enabled: z.boolean(),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>

export const emptyClientForm: ClientFormValues = {
  clientId: '',
  name: '',
  type: 'CONFIDENTIAL',
  grantTypes: [],
  redirectUris: '',
  postLogoutRedirectUris: '',
  webOrigins: '',
  enabled: true,
}

export function clientFormValues(client: Client): ClientFormValues {
  return {
    clientId: client.clientId,
    name: client.name,
    type: client.type,
    grantTypes: [...client.grantTypes],
    redirectUris: fromLines(client.redirectUris),
    postLogoutRedirectUris: fromLines(client.postLogoutRedirectUris),
    webOrigins: fromLines(client.webOrigins),
    enabled: client.enabled,
  }
}

export function toClientSettings(values: ClientFormValues): ClientSettings {
  return {
    name: values.name,
    grantTypes: values.grantTypes,
    redirectUris: toLines(values.redirectUris),
    postLogoutRedirectUris: toLines(values.postLogoutRedirectUris),
    webOrigins: toLines(values.webOrigins),
    enabled: values.enabled,
  }
}

export function toNewClient(values: ClientFormValues): NewClient {
  const { enabled: _enabled, ...settings } = toClientSettings(values)
  return { ...settings, clientId: values.clientId, type: values.type }
}
