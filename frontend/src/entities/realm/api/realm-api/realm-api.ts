import { adminHttp } from '@/shared/api'
import { realmListSchema } from '../../model/realm-schema/realm.schema.ts'
import type { Realm } from '../../model/realm-schema/realm.schema.ts'

export async function listRealms(): Promise<Realm[]> {
  const response = await adminHttp.get<unknown>('/admin/realms')
  return realmListSchema.parse(response.data)
}
