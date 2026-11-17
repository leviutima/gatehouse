import { ZodError } from 'zod'
import { describe, expect, it } from 'vitest'
import { adminHttp } from '@/shared/api'
import { fakeAdapter } from '@/shared/api/testing/fake-adapter.ts'
import type { FakeResponse } from '@/shared/api/testing/fake-adapter.ts'
import {
  assignUserRole,
  createRole,
  deleteRole,
  listRoles,
  listUserRoles,
  unassignUserRole,
} from './role-api.ts'

const admin = {
  id: '1',
  name: 'admin',
  description: 'Administers the realm',
}
const realm = { realm: 'shop' }
const client = { realm: 'shop', clientId: 'billing' }

let lastBody: unknown

function answer(response: FakeResponse) {
  const requests: string[] = []
  adminHttp.defaults.adapter = fakeAdapter((config) => {
    requests.push(`${config.method?.toUpperCase()} ${config.url}`)
    lastBody = config.data
    return response
  })
  return requests
}

describe('listRoles', () => {
  it('reads the roles of the scope, keeping only what it uses', async () => {
    const requests = answer({
      status: 200,
      data: [{ ...admin, createdAt: '2026-11-16T00:00:00.000Z' }],
    })

    await expect(listRoles(realm)).resolves.toEqual([admin])
    await listRoles(client)

    expect(requests).toEqual([
      'GET /admin/realms/shop/roles',
      'GET /admin/realms/shop/clients/billing/roles',
    ])
  })

  it.each([
    ['is not a list', { roles: [] }],
    ['has a role without a name', [{ ...admin, name: undefined }]],
    ['has a role without a description', [{ ...admin, description: undefined }]],
  ])('rejects an answer that %s', async (_name, data) => {
    answer({ status: 200, data })

    await expect(listRoles(realm)).rejects.toBeInstanceOf(ZodError)
  })
})

describe('createRole', () => {
  it('posts the new role and reads the created one back', async () => {
    const requests = answer({ status: 201, data: admin })

    await expect(
      createRole(client, { name: 'admin', description: 'Administers' }),
    ).resolves.toEqual(admin)
    expect(requests).toEqual(['POST /admin/realms/shop/clients/billing/roles'])
    expect(JSON.parse(lastBody as string)).toEqual({
      name: 'admin',
      description: 'Administers',
    })
  })
})

describe('deleteRole', () => {
  it('deletes the role by its encoded name', async () => {
    const requests = answer({ status: 204 })

    await deleteRole(realm, 'billing:read/x')

    expect(requests).toEqual([
      'DELETE /admin/realms/shop/roles/billing%3Aread%2Fx',
    ])
  })
})

describe('user roles', () => {
  it('lists, gives and takes the roles of a user in a scope', async () => {
    const requests = answer({ status: 200, data: [admin] })

    await expect(listUserRoles(client, 'u1')).resolves.toEqual([admin])
    await assignUserRole(client, 'u1', 'viewer')
    await unassignUserRole(realm, 'u1', 'admin')

    expect(requests).toEqual([
      'GET /admin/realms/shop/users/u1/client-roles/billing',
      'PUT /admin/realms/shop/users/u1/client-roles/billing/viewer',
      'DELETE /admin/realms/shop/users/u1/roles/admin',
    ])
  })
})
