import { ZodError } from 'zod'
import { describe, expect, it } from 'vitest'
import { adminHttp } from '@/shared/api'
import { fakeAdapter } from '@/shared/api/testing/fake-adapter.ts'
import type { FakeResponse } from '@/shared/api/testing/fake-adapter.ts'
import { createRealm, getRealm, listRealms, updateRealm } from './realm-api.ts'

const master = {
  id: '1',
  name: 'master',
  displayName: 'Master',
  enabled: true,
  loginIdentifier: 'USERNAME_OR_EMAIL',
  passwordMinLength: 8,
  accessTokenLifespan: 300,
  sessionIdleTimeout: 1800,
  sessionMaxLifespan: 36000,
}

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

describe('listRealms', () => {
  it('reads the realms from the admin API, keeping only what it uses', async () => {
    const requests = answer({
      status: 200,
      data: [{ ...master, createdAt: '2026-11-16T00:00:00.000Z' }],
    })

    await expect(listRealms()).resolves.toEqual([master])
    expect(requests).toEqual(['GET /admin/realms'])
  })

  it.each([
    ['is not a list', { realms: [] }],
    ['has a realm without a name', [{ ...master, name: undefined }]],
    ['has a realm with an invalid status', [{ ...master, enabled: 'yes' }]],
    ['has an unknown login identifier', [{ ...master, loginIdentifier: 'PHONE' }]],
  ])('rejects an answer that %s', async (_name, data) => {
    answer({ status: 200, data })

    await expect(listRealms()).rejects.toBeInstanceOf(ZodError)
  })
})

describe('one realm', () => {
  it('reads, creates and updates a realm', async () => {
    const requests = answer({ status: 200, data: master })

    await expect(getRealm('a/b')).resolves.toEqual(master)
    await createRealm({
      name: 'shop',
      displayName: 'Shop',
      loginIdentifier: 'EMAIL',
    })
    await updateRealm('shop', { enabled: false })

    expect(requests).toEqual([
      'GET /admin/realms/a%2Fb',
      'POST /admin/realms',
      'PATCH /admin/realms/shop',
    ])
    expect(JSON.parse(lastBody as string)).toEqual({ enabled: false })
  })
})
