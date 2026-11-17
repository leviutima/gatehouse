import { adminHttp } from '@/shared/api'
import { realmListSchema, realmSchema } from '../../model/realm-schema/realm.schema.ts'
import type {
  LoginIdentifier,
  Realm,
} from '../../model/realm-schema/realm.schema.ts'

export interface RealmSettings {
  displayName: string
  enabled: boolean
  passwordMinLength: number
  accessTokenLifespan: number
  sessionIdleTimeout: number
  sessionMaxLifespan: number
}

export interface NewRealm {
  name: string
  displayName: string
  loginIdentifier: LoginIdentifier
  admin?: { username?: string; email: string; password: string }
}

function realmPath(name: string): string {
  return `/admin/realms/${encodeURIComponent(name)}`
}

export async function listRealms(): Promise<Realm[]> {
  const response = await adminHttp.get<unknown>('/admin/realms')
  return realmListSchema.parse(response.data)
}

export async function getRealm(name: string): Promise<Realm> {
  const response = await adminHttp.get<unknown>(realmPath(name))
  return realmSchema.parse(response.data)
}

export async function createRealm(realm: NewRealm): Promise<Realm> {
  const response = await adminHttp.post<unknown>('/admin/realms', realm)
  return realmSchema.parse(response.data)
}

export async function updateRealm(
  name: string,
  changes: Partial<RealmSettings>,
): Promise<Realm> {
  const response = await adminHttp.patch<unknown>(realmPath(name), changes)
  return realmSchema.parse(response.data)
}
