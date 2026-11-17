import { describe, expect, it } from 'vitest'
import {
  createRealmSchema,
  emptyRealmForm,
  toNewRealm,
} from './create-realm.schema.ts'

const shop = { ...emptyRealmForm, name: 'shop', displayName: 'Shop' }

describe('create realm form', () => {
  it('needs only a name and a display name without a first admin', () => {
    expect(createRealmSchema.safeParse(shop).success).toBe(true)
    expect(toNewRealm(shop)).toEqual({
      name: 'shop',
      displayName: 'Shop',
      loginIdentifier: 'USERNAME_OR_EMAIL',
    })
  })

  it('asks for the username, the email and the password of the first admin', () => {
    const result = createRealmSchema.safeParse({ ...shop, withAdmin: true })

    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      'adminUsername',
      'adminEmail',
      'adminPassword',
    ])
  })

  it('does not ask for a username when the email is the login', () => {
    const result = createRealmSchema.safeParse({
      ...shop,
      loginIdentifier: 'EMAIL',
      withAdmin: true,
      adminEmail: 'ana@shop.example',
      adminPassword: 'x',
    })

    expect(result.success).toBe(true)
  })

  it('sends the first admin, without a username when the email is the login', () => {
    const values = {
      ...shop,
      loginIdentifier: 'EMAIL' as const,
      withAdmin: true,
      adminUsername: 'ana',
      adminEmail: 'ana@shop.example',
      adminPassword: 'a-long-enough-password',
    }

    expect(toNewRealm(values).admin).toEqual({
      username: undefined,
      email: 'ana@shop.example',
      password: 'a-long-enough-password',
    })
    expect(
      toNewRealm({ ...values, loginIdentifier: 'USERNAME' }).admin?.username,
    ).toBe('ana')
  })
})
