import { describe, expect, it } from 'vitest'
import { envSchema } from './env.ts'

describe('envSchema', () => {
  it('accepts the URL of Gatehouse', () => {
    expect(
      envSchema.parse({ VITE_GATEHOUSE_ISSUER: 'https://id.example.com' }),
    ).toEqual({ VITE_GATEHOUSE_ISSUER: 'https://id.example.com' })
  })

  it.each([
    ['a missing value', {}],
    ['a value that is not a URL', { VITE_GATEHOUSE_ISSUER: 'id.example.com' }],
    ['another protocol', { VITE_GATEHOUSE_ISSUER: 'ftp://id.example.com' }],
  ])('rejects %s', (_name, raw) => {
    expect(envSchema.safeParse(raw).success).toBe(false)
  })
})
