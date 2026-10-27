import { FakeSecretHasher } from '../../../../shared/testing/fake-secret-hasher.js';
import { SequentialSecretGenerator } from '../../../../shared/testing/sequential-secret-generator.js';
import { FixedClock, TEST_NOW } from '../../../../shared/testing/test-clock.js';
import { InMemoryAuthorizationCodeRepository } from '../../testing/in-memory-authorization-code.repository.js';
import { AuthorizationCodeIssuer } from './authorization-code-issuer.js';

describe('AuthorizationCodeIssuer', () => {
  it('stores only the hash of a code that lives for 60 seconds', async () => {
    const codes = new InMemoryAuthorizationCodeRepository();
    const issuer = new AuthorizationCodeIssuer(
      codes,
      new SequentialSecretGenerator('code'),
      new FakeSecretHasher(),
      new FixedClock(),
    );
    const grant = {
      realmId: 'shop-id',
      clientId: 'client-1',
      userId: 'user-1',
      sessionId: 'session-1',
      redirectUri: 'https://app.example.com/callback',
      scope: 'openid email',
      codeChallenge: 'challenge',
      nonce: 'nonce-1',
    };

    const code = await issuer.issue(grant);

    expect(code).toBe('code-1');
    expect(codes.codes).toEqual([
      expect.objectContaining({
        ...grant,
        codeHash: 'hashed:code-1',
        expiresAt: new Date(TEST_NOW.getTime() + 60_000),
        consumedAt: null,
      }),
    ]);
  });
});
