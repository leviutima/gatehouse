import { ClientType } from '../client-type.js';
import { InvalidClientConfigurationError } from '../errors/invalid-client-configuration.error.js';
import { GrantType } from '../grant-type.js';
import { Client, ClientProps } from './client.entity.js';

function client(overrides: Partial<ClientProps> = {}): Client {
  return new Client({
    id: 'client-1',
    realmId: 'realm-1',
    clientId: 'web',
    name: 'Web',
    type: ClientType.PUBLIC,
    secretHash: null,
    redirectUris: ['https://app.example.com/callback'],
    grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('Client', () => {
  it('accepts a public client using authorization code and refresh token', () => {
    expect(client().isConfidential).toBe(false);
  });

  it('accepts a confidential machine-to-machine client without redirect URIs', () => {
    const service = client({
      type: ClientType.CONFIDENTIAL,
      secretHash: 'hash',
      redirectUris: [],
      grantTypes: [GrantType.CLIENT_CREDENTIALS],
    });

    expect(service.isConfidential).toBe(true);
    expect(service.allowsGrant(GrantType.CLIENT_CREDENTIALS)).toBe(true);
  });

  it.each<[string, Partial<ClientProps>]>([
    ['no grant types', { grantTypes: [] }],
    ['a public client with a secret', { secretHash: 'hash' }],
    [
      'a public client using client_credentials',
      { grantTypes: [GrantType.CLIENT_CREDENTIALS] },
    ],
    [
      'a confidential client without a secret',
      { type: ClientType.CONFIDENTIAL },
    ],
    [
      'refresh_token without authorization_code',
      {
        type: ClientType.CONFIDENTIAL,
        secretHash: 'hash',
        grantTypes: [GrantType.CLIENT_CREDENTIALS, GrantType.REFRESH_TOKEN],
      },
    ],
    ['authorization_code without redirect URIs', { redirectUris: [] }],
    [
      'an invalid redirect URI',
      { redirectUris: ['http://app.example.com/callback'] },
    ],
  ])('rejects %s', (_case, overrides) => {
    expect(() => client(overrides)).toThrow(InvalidClientConfigurationError);
  });

  it('reports which grants it allows', () => {
    const web = client();

    expect(web.allowsGrant(GrantType.AUTHORIZATION_CODE)).toBe(true);
    expect(web.allowsGrant(GrantType.CLIENT_CREDENTIALS)).toBe(false);
  });

  describe('isRedirectUriAllowed', () => {
    it('allows a registered redirect URI', () => {
      expect(
        client().isRedirectUriAllowed('https://app.example.com/callback'),
      ).toBe(true);
    });

    it.each([
      'https://app.example.com/callback/',
      'https://APP.example.com/callback',
      'https://app.example.com/callback?x=1',
      'https://app.example.com:443/callback',
      'https://app.example.com/callback/../callback',
      'https://app.example.com',
    ])('rejects %s because matching is exact', (uri) => {
      expect(client().isRedirectUriAllowed(uri)).toBe(false);
    });
  });
});
