import { adminHttp } from '@/shared/api'
import { roleListSchema, roleSchema } from '../../model/role-schema/role.schema.ts'
import type { Role } from '../../model/role-schema/role.schema.ts'

export interface NewRole {
  name: string
  description?: string
}

function realmRolesPath(realm: string): string {
  return `/admin/realms/${encodeURIComponent(realm)}/roles`
}

export async function listRealmRoles(realm: string): Promise<Role[]> {
  const response = await adminHttp.get<unknown>(realmRolesPath(realm))
  return roleListSchema.parse(response.data)
}

export async function createRealmRole(
  realm: string,
  role: NewRole,
): Promise<Role> {
  const response = await adminHttp.post<unknown>(realmRolesPath(realm), role)
  return roleSchema.parse(response.data)
}

export async function deleteRealmRole(
  realm: string,
  roleName: string,
): Promise<void> {
  await adminHttp.delete(
    `${realmRolesPath(realm)}/${encodeURIComponent(roleName)}`,
  )
}
