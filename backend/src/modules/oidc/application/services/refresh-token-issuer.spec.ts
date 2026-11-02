import { FakeSecretHasher } from '../../../../shared/testing/fake-secret-hasher.js';
import { SequentialSecretGenerator } from '../../../../shared/testing/sequential-secret-generator.js';
import { TEST_NOW } from '../../../../shared/testing/test-clock.js';
import { Session } from '../../../sessions/domain/entities/session.entity.js';
import { InMemoryRefreshTokenRepository } from '../../testing/in-memory-refresh-token.repository.js';
import { RefreshTokenIssuer } from './refresh-token-issuer.js';

describe('RefreshTokenIssuer', () => {
  const session = new Session({
    id: 'session-1',
    realmId: 'shop-id',
    userId: 'user-1',
    tokenHash: 'hash',
    authTime: TEST_NOW,
    lastSeenAt: TEST_NOW,
    expiresAt: new Date(TEST_NOW.getTime() + 36_000_000),
    createdAt: TEST_NOW,
  });

  let tokens: InMemoryRefreshTokenRepository;
  let issuer: RefreshTokenIssuer;

  beforeEach(() => {
    tokens = new InMemoryRefreshTokenRepository();
    issuer = new RefreshTokenIssuer(
      tokens,
      new SequentialSecretGenerator('refresh'),
      new FakeSecretHasher(),
    );
  });

  it('stores only the hash of a token that dies with its session', async () => {
    const token = await issuer.issue({
      clientId: 'client-1',
      session,
      scope: 'openid',
    });

    expect(token).toBe('refresh-1');
    expect(tokens.tokens[0]).toMatchObject({
      realmId: 'shop-id',
      tokenHash: 'hashed:refresh-1',
      clientId: 'client-1',
      userId: 'user-1',
      sessionId: 'session-1',
      scope: 'openid',
      expiresAt: session.expiresAt,
      usedAt: null,
    });
  });

  it('starts a new family unless it is rotating one', async () => {
    await issuer.issue({ clientId: 'client-1', session, scope: 'openid' });
    await issuer.issue({
      clientId: 'client-1',
      session,
      scope: 'openid',
      familyId: tokens.tokens[0].familyId,
    });

    expect(tokens.tokens[1].familyId).toBe(tokens.tokens[0].familyId);
  });
});
