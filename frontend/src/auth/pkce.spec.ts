import { describe, expect, it } from 'vitest'
import { randomToken, s256Challenge } from './pkce.ts'

describe('s256Challenge', () => {
  it('matches the example of RFC 7636 appendix B', async () => {
    const challenge = await s256Challenge(
      'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    )

    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('randomToken', () => {
  it('generates a URL-safe verifier within the PKCE length limits', () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('generates a different value each time', () => {
    expect(randomToken()).not.toBe(randomToken())
  })
})
