import { ClientType } from '../../../clients/domain/client-type.js';
import { Client } from '../../../clients/domain/entities/client.entity.js';
import { GrantType } from '../../../clients/domain/grant-type.js';
import { InMemoryClientRepository } from '../../../clients/testing/in-memory-client.repository.js';
import { TEST_NOW } from '../../../../shared/testing/test-clock.js';
import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import {
  AuthorizationParams,
  AuthorizationRequestValidator,
} from './authorization-request-validator.js';

const redirectUri = 'https://app.example.com/callback';
const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

function client(
  overrides: Partial<ConstructorParameters<typeof Client>[0]> = {},
) {
  return new Client({
    id: 'web-id',
    realmId: 'shop-id',
    clientId: 'web',
    name: 'Web',
    type: ClientType.PUBLIC,
    secretHash: null,
    redirectUris: [redirectUri],
    grantTypes: [GrantType.AUTHORIZATION_CODE],
    enabled: true,
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    ...overrides,
  });
}

describe('AuthorizationRequestValidator', () => {
  const validator = new AuthorizationRequestValidator(
    new InMemoryRealmRepository([
      aRealm({ name: 'shop' }),
      aRealm({ name: 'closed', enabled: false }),
    ]),
    new InMemoryClientRepository([
      client(),
      client({ id: 'off-id', clientId: 'off', enabled: false }),
      client({
        id: 'm2m-id',
        clientId: 'm2m',
        type: ClientType.CONFIDENTIAL,
        secretHash: 'hash',
        grantTypes: [GrantType.CLIENT_CREDENTIALS],
      }),
    ]),
  );

  const params = (
    overrides: AuthorizationParams = {},
  ): AuthorizationParams => ({
    response_type: 'code',
    client_id: 'web',
    redirect_uri: redirectUri,
    scope: 'openid email',
    state: 'state-1',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    nonce: 'nonce-1',
    ...overrides,
  });

  it('accepts a complete request', async () => {
    await expect(validator.validate('shop', params())).resolves.toMatchObject({
      kind: 'valid',
      request: {
        client: { clientId: 'web' },
        redirectUri,
        scope: 'openid email',
        state: 'state-1',
        codeChallenge: challenge,
        nonce: 'nonce-1',
      },
    });
  });

  it('removes repeated scope values', async () => {
    await expect(
      validator.validate('shop', params({ scope: 'openid  openid email' })),
    ).resolves.toMatchObject({ request: { scope: 'openid email' } });
  });

  it.each([
    ['an unknown realm', 'missing', params()],
    ['a disabled realm', 'closed', params()],
    ['a missing client_id', 'shop', params({ client_id: undefined })],
    ['an unknown client', 'shop', params({ client_id: 'ghost' })],
    ['a disabled client', 'shop', params({ client_id: 'off' })],
    ['a repeated client_id', 'shop', params({ client_id: ['web', 'web'] })],
    ['a missing redirect_uri', 'shop', params({ redirect_uri: undefined })],
    [
      'an unregistered redirect_uri',
      'shop',
      params({ redirect_uri: 'https://evil.example.com/callback' }),
    ],
    [
      'a redirect_uri that only starts like a registered one',
      'shop',
      params({ redirect_uri: `${redirectUri}/extra` }),
    ],
  ])('never redirects for %s', async (_case, realmName, request) => {
    await expect(validator.validate(realmName, request)).resolves.toMatchObject(
      { kind: 'rejected' },
    );
  });

  it.each([
    [
      'a missing response_type',
      { response_type: undefined },
      'invalid_request',
    ],
    [
      'response_type=token',
      { response_type: 'token' },
      'unsupported_response_type',
    ],
    [
      'a missing code_challenge',
      { code_challenge: undefined },
      'invalid_request',
    ],
    [
      'the plain PKCE method',
      { code_challenge_method: 'plain' },
      'invalid_request',
    ],
    [
      'a malformed code_challenge',
      { code_challenge: 'short' },
      'invalid_request',
    ],
    ['an unsupported scope', { scope: 'openid admin' }, 'invalid_scope'],
    ['a repeated parameter', { scope: ['openid', 'email'] }, 'invalid_request'],
    ['an oversized state', { state: 'a'.repeat(513) }, 'invalid_request'],
  ])('returns %s to the client', async (_case, overrides, error) => {
    await expect(
      validator.validate('shop', params(overrides)),
    ).resolves.toMatchObject({
      kind: 'redirect_error',
      redirectUri,
      error,
    });
  });

  it('keeps the state when returning an error to the client', async () => {
    await expect(
      validator.validate('shop', params({ response_type: 'token' })),
    ).resolves.toMatchObject({ state: 'state-1' });
  });

  it('returns unauthorized_client when the client lacks the grant', async () => {
    await expect(
      validator.validate('shop', params({ client_id: 'm2m' })),
    ).resolves.toMatchObject({
      kind: 'redirect_error',
      error: 'unauthorized_client',
    });
  });
});
