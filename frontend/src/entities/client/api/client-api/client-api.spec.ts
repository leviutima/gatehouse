import { ZodError } from 'zod'
import { describe, expect, it } from 'vitest'
import { adminHttp } from '@/shared/api'
import { fakeAdapter } from '@/shared/api/testing/fake-adapter.ts'
import type { FakeResponse } from '@/shared/api/testing/fake-adapter.ts'
import {
  createClient,
  getClient,
  listClients,
  rotateClientSecret,
  updateClient,
} from './client-api.ts'

const billing = {
  id: 'c1',
  clientId: 'billing',
  name: 'Billing',
  type: 'CONFIDENTIAL',
  redirectUris: [],
  postLogoutRedirectUris: [],
  webOrigins: [],
  grantTypes: ['CLIENT_CREDENTIALS'],
  enabled: true,
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

describe('listClients', () => {
  it('reads the clients of the realm, keeping only what it uses', async () => {
    const requests = answer({
      status: 200,
      data: [{ ...billing, createdAt: '2026-11-16T00:00:00.000Z' }],
    })

    await expect(listClients('shop')).resolves.toEqual([billing])
    expect(requests).toEqual(['GET /admin/realms/shop/clients'])
  })

  it.each([
    ['has an unknown type', [{ ...billing, type: 'SPA' }]],
    ['has an unknown grant', [{ ...billing, grantTypes: ['PASSWORD'] }]],
  ])('rejects an answer that %s', async (_name, data) => {
    answer({ status: 200, data })

    await expect(listClients('shop')).rejects.toBeInstanceOf(ZodError)
  })
})

describe('one client', () => {
  it('reads and updates a client by its encoded client id', async () => {
    const requests = answer({ status: 200, data: billing })

    await expect(getClient('shop', 'a:b')).resolves.toEqual(billing)
    await updateClient('shop', 'billing', { enabled: false })

    expect(requests).toEqual([
      'GET /admin/realms/shop/clients/a%3Ab',
      'PATCH /admin/realms/shop/clients/billing',
    ])
    expect(JSON.parse(lastBody as string)).toEqual({ enabled: false })
  })

  it('creates a client and keeps the secret shown only once', async () => {
    answer({ status: 201, data: { ...billing, secret: 's3cret' } })

    await expect(
      createClient('shop', {
        clientId: 'billing',
        name: 'Billing',
        type: 'CONFIDENTIAL',
        redirectUris: [],
        postLogoutRedirectUris: [],
        webOrigins: [],
        grantTypes: ['CLIENT_CREDENTIALS'],
      }),
    ).resolves.toEqual({ ...billing, secret: 's3cret' })
  })

  it('generates a new secret', async () => {
    const requests = answer({ status: 200, data: { secret: 'n3w' } })

    await expect(rotateClientSecret('shop', 'billing')).resolves.toBe('n3w')
    expect(requests).toEqual(['POST /admin/realms/shop/clients/billing/secret'])
  })
})
