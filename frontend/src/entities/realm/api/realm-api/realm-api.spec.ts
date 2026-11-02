import { ZodError } from 'zod'
import { describe, expect, it } from 'vitest'
import { adminHttp } from '@/shared/api'
import { fakeAdapter } from '@/shared/api/testing/fake-adapter.ts'
import type { FakeResponse } from '@/shared/api/testing/fake-adapter.ts'
import { listRealms } from './realm-api.ts'

const master = {
  id: '1',
  name: 'master',
  displayName: 'Master',
  enabled: true,
}

function answer(response: FakeResponse) {
  const urls: (string | undefined)[] = []
  adminHttp.defaults.adapter = fakeAdapter((config) => {
    urls.push(config.url)
    return response
  })
  return urls
}

describe('listRealms', () => {
  it('reads the realms from the admin API, keeping only what it uses', async () => {
    const urls = answer({
      status: 200,
      data: [{ ...master, sessionMaxLifespan: 3600 }],
    })

    await expect(listRealms()).resolves.toEqual([master])
    expect(urls).toEqual(['/admin/realms'])
  })

  it.each([
    ['is not a list', { realms: [] }],
    ['has a realm without a name', [{ ...master, name: undefined }]],
    ['has a realm with an invalid status', [{ ...master, enabled: 'yes' }]],
  ])('rejects an answer that %s', async (_name, data) => {
    answer({ status: 200, data })

    await expect(listRealms()).rejects.toBeInstanceOf(ZodError)
  })
})
