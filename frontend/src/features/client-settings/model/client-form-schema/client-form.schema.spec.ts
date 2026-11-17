import { describe, expect, it } from 'vitest'
import type { Client } from '@/entities/client'
import {
  clientFormSchema,
  clientFormValues,
  emptyClientForm,
  toClientSettings,
  toNewClient,
} from './client-form.schema.ts'

const web: Client = {
  id: 'c1',
  clientId: 'web',
  name: 'Web',
  type: 'PUBLIC',
  redirectUris: ['https://app.example/cb', 'https://app.example/cb2'],
  postLogoutRedirectUris: [],
  webOrigins: ['https://app.example'],
  grantTypes: ['AUTHORIZATION_CODE', 'REFRESH_TOKEN'],
  enabled: true,
}

describe('client form', () => {
  it('asks for a client id, a name and at least one grant', () => {
    const result = clientFormSchema.safeParse(emptyClientForm)

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      'clientId',
      'name',
      'grantTypes',
    ])
  })

  it('turns a client into form values and back without losing anything', () => {
    const values = clientFormValues(web)

    expect(values.redirectUris).toBe(
      'https://app.example/cb\nhttps://app.example/cb2',
    )
    expect(toClientSettings(values)).toEqual({
      name: 'Web',
      grantTypes: ['AUTHORIZATION_CODE', 'REFRESH_TOKEN'],
      redirectUris: ['https://app.example/cb', 'https://app.example/cb2'],
      postLogoutRedirectUris: [],
      webOrigins: ['https://app.example'],
      enabled: true,
    })
  })

  it('builds a new client with its id and type but without the status', () => {
    const created = toNewClient({
      ...clientFormValues(web),
      redirectUris: ' https://app.example/cb \n\n',
    })

    expect(created).toEqual({
      clientId: 'web',
      name: 'Web',
      type: 'PUBLIC',
      grantTypes: ['AUTHORIZATION_CODE', 'REFRESH_TOKEN'],
      redirectUris: ['https://app.example/cb'],
      postLogoutRedirectUris: [],
      webOrigins: ['https://app.example'],
    })
  })
})
