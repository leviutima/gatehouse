import { describe, expect, it } from 'vitest'
import { rolesPath, scopeKey, userRolesPath } from './role-scope.ts'

describe('role scope', () => {
  it('points a realm scope at the realm roles', () => {
    expect(rolesPath({ realm: 'shop' })).toBe('/admin/realms/shop/roles')
    expect(userRolesPath({ realm: 'shop' }, 'u1')).toBe(
      '/admin/realms/shop/users/u1/roles',
    )
    expect(scopeKey({ realm: 'shop' })).toEqual(['realms', 'shop', 'roles'])
  })

  it('points a client scope at the roles of the client', () => {
    const scope = { realm: 'shop', clientId: 'billing' }

    expect(rolesPath(scope)).toBe('/admin/realms/shop/clients/billing/roles')
    expect(userRolesPath(scope, 'u1')).toBe(
      '/admin/realms/shop/users/u1/client-roles/billing',
    )
    expect(scopeKey(scope)).toEqual([
      'realms',
      'shop',
      'clients',
      'billing',
      'roles',
    ])
  })

  it('encodes every part of the path', () => {
    expect(rolesPath({ realm: 'a/b', clientId: 'c:d' })).toBe(
      '/admin/realms/a%2Fb/clients/c%3Ad/roles',
    )
  })
})
