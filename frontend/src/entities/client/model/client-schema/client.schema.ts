import { z } from 'zod'

export const clientTypes = ['PUBLIC', 'CONFIDENTIAL'] as const

export const grantTypes = [
  'AUTHORIZATION_CODE',
  'REFRESH_TOKEN',
  'CLIENT_CREDENTIALS',
] as const

export const clientSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  name: z.string(),
  type: z.enum(clientTypes),
  redirectUris: z.array(z.string()),
  postLogoutRedirectUris: z.array(z.string()),
  webOrigins: z.array(z.string()),
  grantTypes: z.array(z.enum(grantTypes)),
  enabled: z.boolean(),
})

export const clientListSchema = z.array(clientSchema)

export const createdClientSchema = clientSchema.extend({
  secret: z.string().nullable(),
})

export const clientSecretSchema = z.object({ secret: z.string() })

export type Client = z.infer<typeof clientSchema>
export type ClientType = Client['type']
export type GrantType = Client['grantTypes'][number]
export type CreatedClient = z.infer<typeof createdClientSchema>
