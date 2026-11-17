import { adminHttp } from '@/shared/api'
import {
  clientListSchema,
  clientSchema,
  clientSecretSchema,
  createdClientSchema,
} from '../../model/client-schema/client.schema.ts'
import type {
  Client,
  ClientType,
  CreatedClient,
  GrantType,
} from '../../model/client-schema/client.schema.ts'

export interface ClientSettings {
  name: string
  redirectUris: string[]
  postLogoutRedirectUris: string[]
  webOrigins: string[]
  grantTypes: GrantType[]
  enabled: boolean
}

export interface NewClient extends Omit<ClientSettings, 'enabled'> {
  clientId: string
  type: ClientType
}

function clientsPath(realm: string): string {
  return `/admin/realms/${encodeURIComponent(realm)}/clients`
}

function clientPath(realm: string, clientId: string): string {
  return `${clientsPath(realm)}/${encodeURIComponent(clientId)}`
}

export async function listClients(realm: string): Promise<Client[]> {
  const response = await adminHttp.get<unknown>(clientsPath(realm))
  return clientListSchema.parse(response.data)
}

export async function getClient(
  realm: string,
  clientId: string,
): Promise<Client> {
  const response = await adminHttp.get<unknown>(clientPath(realm, clientId))
  return clientSchema.parse(response.data)
}

export async function createClient(
  realm: string,
  client: NewClient,
): Promise<CreatedClient> {
  const response = await adminHttp.post<unknown>(clientsPath(realm), client)
  return createdClientSchema.parse(response.data)
}

export async function updateClient(
  realm: string,
  clientId: string,
  changes: Partial<ClientSettings>,
): Promise<Client> {
  const response = await adminHttp.patch<unknown>(
    clientPath(realm, clientId),
    changes,
  )
  return clientSchema.parse(response.data)
}

export async function rotateClientSecret(
  realm: string,
  clientId: string,
): Promise<string> {
  const response = await adminHttp.post<unknown>(
    `${clientPath(realm, clientId)}/secret`,
  )
  return clientSecretSchema.parse(response.data).secret
}
