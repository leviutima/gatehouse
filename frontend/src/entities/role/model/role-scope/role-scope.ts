export interface RoleScope {
  realm: string
  clientId?: string
}

function realmPath(realm: string): string {
  return `/admin/realms/${encodeURIComponent(realm)}`
}

export function rolesPath({ realm, clientId }: RoleScope): string {
  return clientId === undefined
    ? `${realmPath(realm)}/roles`
    : `${realmPath(realm)}/clients/${encodeURIComponent(clientId)}/roles`
}

export function userRolesPath(
  { realm, clientId }: RoleScope,
  userId: string,
): string {
  const userPath = `${realmPath(realm)}/users/${encodeURIComponent(userId)}`
  return clientId === undefined
    ? `${userPath}/roles`
    : `${userPath}/client-roles/${encodeURIComponent(clientId)}`
}

export function scopeKey({ realm, clientId }: RoleScope) {
  return clientId === undefined
    ? (['realms', realm, 'roles'] as const)
    : (['realms', realm, 'clients', clientId, 'roles'] as const)
}
