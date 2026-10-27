import { ConfigService } from '@nestjs/config';
import { ClientType } from '../../../clients/domain/client-type.js';
import { GrantType } from '../../../clients/domain/grant-type.js';
import { InMemoryClientRepository } from '../../../clients/testing/in-memory-client.repository.js';
import type { Env } from '../../../../shared/infrastructure/config/env.schema.js';
import { FakePasswordHasher } from '../../../../shared/testing/fake-password-hasher.js';
import { FakeSecretHasher } from '../../../../shared/testing/fake-secret-hasher.js';
import { SequentialSecretGenerator } from '../../../../shared/testing/sequential-secret-generator.js';
import { FixedClock } from '../../../../shared/testing/test-clock.js';
import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { SessionManager } from '../../../sessions/application/services/session-manager.js';
import { InMemorySessionRepository } from '../../../sessions/testing/in-memory-session.repository.js';
import { PasswordAuthenticator } from '../../../users/application/services/password-authenticator.js';
import { InMemoryUserRepository } from '../../../users/testing/in-memory-user.repository.js';
import { ConfigRealmIssuer } from '../../infrastructure/config-realm-issuer.js';
import { InMemoryAuthorizationCodeRepository } from '../../testing/in-memory-authorization-code.repository.js';
import { AuthorizationCodeIssuer } from '../services/authorization-code-issuer.js';
import { AuthorizationCompleter } from '../services/authorization-completer.js';
import { AuthorizationRequestValidator } from '../services/authorization-request-validator.js';
import { AuthorizeUseCase } from './authorize.use-case.js';
import { SignInUseCase } from './sign-in.use-case.js';

const redirectUri = 'https://app.example.com/callback';
const issuer = 'https://auth.example.com/realms/shop';

describe('Authorization flow', () => {
  let codes: InMemoryAuthorizationCodeRepository;
  let sessions: InMemorySessionRepository;
  let authorize: AuthorizeUseCase;
  let signIn: SignInUseCase;

  const params = {
    response_type: 'code',
    client_id: 'web',
    redirect_uri: redirectUri,
    scope: 'openid',
    state: 'state-1',
    code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    code_challenge_method: 'S256',
  };
  const credentials = { identifier: 'ana', password: 'right-password' };

  beforeEach(async () => {
    const realms = new InMemoryRealmRepository([aRealm({ name: 'shop' })]);
    const clients = new InMemoryClientRepository();
    const users = new InMemoryUserRepository();
    codes = new InMemoryAuthorizationCodeRepository();
    sessions = new InMemorySessionRepository();
    const secrets = new SequentialSecretGenerator();
    const hasher = new FakeSecretHasher();
    const clock = new FixedClock();

    await clients.create({
      realmId: 'shop-id',
      clientId: 'web',
      name: 'Web',
      type: ClientType.PUBLIC,
      secretHash: null,
      redirectUris: [redirectUri],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });
    await users.create({
      realmId: 'shop-id',
      username: 'ana',
      email: 'ana@shop.example',
      emailVerified: false,
      passwordHash: 'hashed:right-password',
    });

    const validator = new AuthorizationRequestValidator(realms, clients);
    const sessionManager = new SessionManager(
      sessions,
      users,
      secrets,
      hasher,
      clock,
    );
    const completer = new AuthorizationCompleter(
      new AuthorizationCodeIssuer(codes, secrets, hasher, clock),
      new ConfigRealmIssuer(
        new ConfigService<Env, true>({
          GATEHOUSE_ISSUER: 'https://auth.example.com',
        }),
      ),
    );
    authorize = new AuthorizeUseCase(validator, sessionManager, completer);
    signIn = new SignInUseCase(
      validator,
      new PasswordAuthenticator(users, new FakePasswordHasher(), secrets),
      sessionManager,
      completer,
    );
  });

  it('asks for a login when there is no session', async () => {
    await expect(
      authorize.execute({ realmName: 'shop', params, sessionToken: undefined }),
    ).resolves.toMatchObject({ kind: 'login_required' });
    expect(codes.codes).toHaveLength(0);
  });

  it('signs in, starts a session and redirects with a code, the state and the issuer', async () => {
    const outcome = await signIn.execute({
      realmName: 'shop',
      params,
      credentials,
    });

    expect(outcome.kind).toBe('signed_in');
    const location = new URL(
      (outcome as Extract<typeof outcome, { kind: 'signed_in' }>).location,
    );
    expect(`${location.origin}${location.pathname}`).toBe(redirectUri);
    expect(Object.fromEntries(location.searchParams)).toEqual({
      code: expect.any(String),
      state: 'state-1',
      iss: issuer,
    });
    expect(sessions.sessions).toHaveLength(1);
    expect(codes.codes[0]).toMatchObject({
      sessionId: sessions.sessions[0].id,
      redirectUri,
      scope: 'openid',
      codeChallenge: params.code_challenge,
    });
  });

  it('skips the login page when the session is still valid', async () => {
    const first = await signIn.execute({
      realmName: 'shop',
      params,
      credentials,
    });
    const { sessionToken } = first as Extract<
      typeof first,
      { kind: 'signed_in' }
    >;

    await expect(
      authorize.execute({ realmName: 'shop', params, sessionToken }),
    ).resolves.toMatchObject({ kind: 'redirect' });
    expect(codes.codes).toHaveLength(2);
    expect(sessions.sessions).toHaveLength(1);
  });

  it('reports a failed sign-in without starting a session', async () => {
    await expect(
      signIn.execute({
        realmName: 'shop',
        params,
        credentials: { ...credentials, password: 'wrong' },
      }),
    ).resolves.toMatchObject({ kind: 'failed' });
    expect(sessions.sessions).toHaveLength(0);
  });

  it('never checks a password for a request it rejects', async () => {
    await expect(
      signIn.execute({
        realmName: 'shop',
        params: { ...params, redirect_uri: 'https://evil.example.com/' },
        credentials,
      }),
    ).resolves.toMatchObject({ kind: 'rejected' });
    expect(sessions.sessions).toHaveLength(0);
  });

  it('returns protocol errors to the registered redirect URI', async () => {
    const outcome = await authorize.execute({
      realmName: 'shop',
      params: { ...params, code_challenge_method: 'plain' },
      sessionToken: undefined,
    });

    expect(outcome.kind).toBe('redirect');
    const location = new URL(
      (outcome as Extract<typeof outcome, { kind: 'redirect' }>).location,
    );
    expect(location.searchParams.get('error')).toBe('invalid_request');
    expect(location.searchParams.get('state')).toBe('state-1');
  });
});
