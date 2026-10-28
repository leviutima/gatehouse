import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose';
import { FakeKeyEncryptor } from '../../../../shared/testing/fake-key-encryptor.js';
import { SequentialSecretGenerator } from '../../../../shared/testing/sequential-secret-generator.js';
import { FixedClock, TEST_NOW } from '../../../../shared/testing/test-clock.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { RealmTokenSigner } from '../../../signing-keys/application/services/realm-token-signer.js';
import { SigningKeyProvisioner } from '../../../signing-keys/application/services/signing-key-provisioner.js';
import { JoseEs256KeyPairGenerator } from '../../../signing-keys/infrastructure/crypto/jose-es256-key-pair-generator.js';
import { JoseJwtSigner } from '../../../signing-keys/infrastructure/crypto/jose-jwt-signer.js';
import { InMemorySigningKeyRepository } from '../../../signing-keys/testing/in-memory-signing-key.repository.js';
import { RealmIssuer } from '../realm-issuer.js';
import { AccessTokenIssuer } from './access-token-issuer.js';

const now = TEST_NOW;
const nowSeconds = now.getTime() / 1000;

class FakeRealmIssuer extends RealmIssuer {
  forRealm(realmName: string): string {
    return `https://auth.example.com/realms/${realmName}`;
  }

  realmNameOf(): string | null {
    return null;
  }
}

describe('AccessTokenIssuer', () => {
  const realm = aRealm({ accessTokenLifespan: 600 });

  let keys: InMemorySigningKeyRepository;
  let issuer: AccessTokenIssuer;

  beforeEach(() => {
    keys = new InMemorySigningKeyRepository();
    const encryptor = new FakeKeyEncryptor();
    issuer = new AccessTokenIssuer(
      new FakeRealmIssuer(),
      new RealmTokenSigner(
        new SigningKeyProvisioner(
          keys,
          new JoseEs256KeyPairGenerator(),
          encryptor,
        ),
        encryptor,
        new JoseJwtSigner(),
      ),
      new SequentialSecretGenerator('token-id'),
      new FixedClock(),
    );
  });

  async function verify(token: string) {
    return jwtVerify(
      token,
      await importJWK(keys.keys[0].toPublishedJwk(), 'ES256'),
      { currentDate: now },
    );
  }

  it('issues an ES256 access token signed with the realm active key', async () => {
    const { token } = await issuer.issue({
      realm,
      subject: 'client-uuid',
      clientId: 'billing',
    });

    expect(decodeProtectedHeader(token)).toEqual({
      alg: 'ES256',
      kid: keys.keys[0].kid,
      typ: 'at+jwt',
    });
    await expect(verify(token)).resolves.toBeDefined();
  });

  it('carries the RFC 9068 claims with the realm lifespan', async () => {
    const { token, expiresIn } = await issuer.issue({
      realm,
      subject: 'client-uuid',
      clientId: 'billing',
    });

    const { payload } = await verify(token);
    expect(expiresIn).toBe(600);
    expect(payload).toEqual({
      iss: 'https://auth.example.com/realms/shop',
      sub: 'client-uuid',
      aud: 'https://auth.example.com/realms/shop',
      client_id: 'billing',
      iat: nowSeconds,
      exp: nowSeconds + 600,
      jti: 'token-id-1',
    });
  });

  it('carries the scope and the session of a user token', async () => {
    const { token } = await issuer.issue({
      realm,
      subject: 'user-1',
      clientId: 'web',
      scope: 'openid email',
      sessionId: 'session-1',
    });

    const { payload } = await verify(token);
    expect(payload).toMatchObject({
      sub: 'user-1',
      scope: 'openid email',
      sid: 'session-1',
    });
  });
});
