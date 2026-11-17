import { adminHttp } from '@/shared/api'
import { roleListSchema, roleSchema } from '../../model/role-schema/role.schema.ts'
import type { Role } from '../../model/role-schema/role.schema.ts'
import { rolesPath, userRolesPath } from '../../model/role-scope/role-scope.ts'
import type { RoleScope } from '../../model/role-scope/role-scope.ts'

export interface NewRole {
  name: string
  description?: string
}

export async function listRoles(scope: RoleScope): Promise<Role[]> {
  const response = await adminHttp.get<unknown>(rolesPath(scope))
  return roleListSchema.parse(response.data)
}

export async function createRole(
  scope: RoleScope,
  role: NewRole,
): Promise<Role> {
  const response = await adminHttp.post<unknown>(rolesPath(scope), role)
  return roleSchema.parse(response.data)
}

export async function deleteRole(
  scope: RoleScope,
  roleName: string,
): Promise<void> {
  await adminHttp.delete(`${rolesPath(scope)}/${encodeURIComponent(roleName)}`)
}

export async function listUserRoles(
  scope: RoleScope,
  userId: string,
): Promise<Role[]> {
  const response = await adminHttp.get<unknown>(userRolesPath(scope, userId))
  return roleListSchema.parse(response.data)
}

export async function assignUserRole(
  scope: RoleScope,
  userId: string,
  roleName: string,
): Promise<void> {
  await adminHttp.put(
    `${userRolesPath(scope, userId)}/${encodeURIComponent(roleName)}`,
  )
}

export async function unassignUserRole(
  scope: RoleScope,
  userId: string,
  roleName: string,
): Promise<void> {
  await adminHttp.delete(
    `${userRolesPath(scope, userId)}/${encodeURIComponent(roleName)}`,
  )
}
