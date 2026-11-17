import { adminHttp } from '@/shared/api'
import { roleListSchema } from '../../model/role-schema/role.schema.ts'
import type { Role } from '../../model/role-schema/role.schema.ts'

export async function listRealmRoles(realm: string): Promise<Role[]> {
  const response = await adminHttp.get<unknown>(
    `/admin/realms/${encodeURIComponent(realm)}/roles`,
  )
  return roleListSchema.parse(response.data)
}
