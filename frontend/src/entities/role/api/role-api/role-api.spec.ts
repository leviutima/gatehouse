import { ZodError } from 'zod'
import { describe, expect, it } from 'vitest'
import { adminHttp } from '@/shared/api'
import { fakeAdapter } from '@/shared/api/testing/fake-adapter.ts'
import type { FakeResponse } from '@/shared/api/testing/fake-adapter.ts'
import { listRealmRoles } from './role-api.ts'

const admin = {
  id: '1',
  name: 'admin',
  description: 'Administers the realm',
}

function answer(response: FakeResponse) {
  const urls: (string | undefined)[] = []
  adminHttp.defaults.adapter = fakeAdapter((config) => {
    urls.push(config.url)
    return response
  })
  return urls
}

describe('listRealmRoles', () => {
  it('reads the roles of the realm, keeping only what it uses', async () => {
    const urls = answer({
      status: 200,
      data: [{ ...admin, createdAt: '2026-11-16T00:00:00.000Z' }],
    })

    await expect(listRealmRoles('shop')).resolves.toEqual([admin])
    expect(urls).toEqual(['/admin/realms/shop/roles'])
  })

  it('encodes the realm name in the path', async () => {
    const urls = answer({ status: 200, data: [] })

    await listRealmRoles('a/b')

    expect(urls).toEqual(['/admin/realms/a%2Fb/roles'])
  })

  it.each([
    ['is not a list', { roles: [] }],
    ['has a role without a name', [{ ...admin, name: undefined }]],
    ['has a role without a description', [{ ...admin, description: undefined }]],
  ])('rejects an answer that %s', async (_name, data) => {
    answer({ status: 200, data })

    await expect(listRealmRoles('shop')).rejects.toBeInstanceOf(ZodError)
  })
})
