import { ZodError } from 'zod'
import { describe, expect, it } from 'vitest'
import { adminHttp } from '@/shared/api'
import { fakeAdapter } from '@/shared/api/testing/fake-adapter.ts'
import type { FakeResponse } from '@/shared/api/testing/fake-adapter.ts'
import {
  createUser,
  getUser,
  listUsers,
  setUserPassword,
  updateUser,
} from './user-api.ts'

const ana = {
  id: 'u1',
  username: 'ana',
  email: 'ana@shop.example',
  emailVerified: false,
  enabled: true,
}

let lastBody: unknown

function answer(response: FakeResponse) {
  const requests: string[] = []
  adminHttp.defaults.adapter = fakeAdapter((config) => {
    const query = new URLSearchParams(config.params as Record<string, string>)
    requests.push(
      `${config.method?.toUpperCase()} ${config.url}${query.size ? `?${query}` : ''}`,
    )
    lastBody = config.data
    return response
  })
  return requests
}

describe('listUsers', () => {
  it('reads a page of users, keeping only what it uses', async () => {
    const requests = answer({
      status: 200,
      data: [{ ...ana, createdAt: '2026-11-16T00:00:00.000Z' }],
    })

    await expect(listUsers('shop', { offset: 50, limit: 50 })).resolves.toEqual(
      [ana],
    )
    expect(requests).toEqual(['GET /admin/realms/shop/users?offset=50&limit=50'])
  })

  it('rejects a user without an email', async () => {
    answer({ status: 200, data: [{ ...ana, email: undefined }] })

    await expect(listUsers('shop', { offset: 0, limit: 50 })).rejects.toBeInstanceOf(
      ZodError,
    )
  })
})

describe('one user', () => {
  it('reads, creates and updates a user', async () => {
    const requests = answer({ status: 200, data: ana })

    await expect(getUser('shop', 'u1')).resolves.toEqual(ana)
    await createUser('shop', {
      username: 'ana',
      email: 'ana@shop.example',
      password: 'a-long-enough-password',
    })
    await updateUser('shop', 'u1', { enabled: false })

    expect(requests).toEqual([
      'GET /admin/realms/shop/users/u1',
      'POST /admin/realms/shop/users',
      'PATCH /admin/realms/shop/users/u1',
    ])
    expect(JSON.parse(lastBody as string)).toEqual({ enabled: false })
  })

  it('sets a new password', async () => {
    const requests = answer({ status: 204 })

    await setUserPassword('shop', 'u1', 'another-long-password')

    expect(requests).toEqual(['PUT /admin/realms/shop/users/u1/password'])
    expect(JSON.parse(lastBody as string)).toEqual({
      password: 'another-long-password',
    })
  })
})
