import { describe, expect, it } from 'vitest'
import { createRoleSchema } from './create-role.schema.ts'

const valid = { name: 'billing:read', description: '' }

describe('createRoleSchema', () => {
  it.each(['billing:read', 'a', 'orders.ship_v2-x', 'A'.repeat(64)])(
    'accepts the name %s',
    (name) => {
      expect(createRoleSchema.safeParse({ ...valid, name }).success).toBe(
        true,
      )
    },
  )

  it.each(['', 'billing read', ':billing', 'A'.repeat(65), 'café'])(
    'rejects the name %j',
    (name) => {
      expect(createRoleSchema.safeParse({ ...valid, name }).success).toBe(
        false,
      )
    },
  )

  it('limits the description to 255 characters', () => {
    expect(
      createRoleSchema.safeParse({ ...valid, description: 'x'.repeat(255) })
        .success,
    ).toBe(true)
    expect(
      createRoleSchema.safeParse({ ...valid, description: 'x'.repeat(256) })
        .success,
    ).toBe(false)
  })
})
