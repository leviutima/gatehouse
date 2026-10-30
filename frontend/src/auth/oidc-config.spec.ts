import { describe, expect, it } from 'vitest'
import { consoleOidcConfig } from './oidc-config.ts'

describe('consoleOidcConfig', () => {
  it('points at the master realm and returns to the console origin', () => {
    expect(
      consoleOidcConfig('https://id.example.com/', 'https://console.example.com'),
    ).toEqual({
      issuer: 'https://id.example.com/realms/master',
      clientId: 'admin-console',
      scope: 'openid profile email',
      redirectUri: 'https://console.example.com/callback',
      postLogoutRedirectUri: 'https://console.example.com/',
    })
  })

  it('refuses to start without the Gatehouse URL', () => {
    expect(() =>
      consoleOidcConfig(undefined, 'https://console.example.com'),
    ).toThrow('VITE_GATEHOUSE_ISSUER is not set')
  })
})
