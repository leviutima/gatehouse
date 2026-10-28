import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose';
import { FakeKeyEncryptor } from '../../../../shared/testing/fake-key-encryptor.js';
import { FixedClock, TEST_NOW } from '../../../../shared/testing/test-clock.js';
import { ClientType } from '../../../clients/domain/client-type.js';
import { Client } from '../../../clients/domain/entities/client.entity.js';
import { GrantType } from '../../../clients/domain/grant-type.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { Session } from '../../../sessions/domain/entities/session.entity.js';
import { RealmTokenSigner } from '../../../signing-keys/application/services/realm-token-signer.js';
import { SigningKeyProvisioner } from '../../../signing-keys/application/services/signing-key-provisioner.js';
import { JoseEs256KeyPairGenerator } from '../../../signing-keys/infrastructure/crypto/jose-es256-key-pair-generator.js';
import { JoseJwtSigner } from '../../../signing-keys/infrastructure/crypto/jose-jwt-signer.js';
import { InMemorySigningKeyRepository } from '../../../signing-keys/testing/in-memory-signing-key.repository.js';
import { User } from '../../../users/domain/entities/user.entity.js';
import { RealmIssuer } from '../realm-issuer.js';
import { IdTokenIssuer } from './id-token-issuer.js';

const nowSeconds = TEST_NOW.getTime() / 1000;
const authTime = new Date(TEST_NOW.getTime() - 120_000);

class FakeRealmIssuer extends RealmIssuer {
  forRealm(realmName: string): string {
    return `https://auth.example.com/realms/${realmName}`;
  }

  realmNameOf(): string | null {
    return null;
  }
}

describe('IdTokenIssuer', () => {
  const realm = aRealm({ name: 'shop', accessTokenLifespan: 600 });
  const client = new Client({
    id: 'web-id',
    realmId: realm.id,
    clientId: 'web',
    name: 'Web',
    type: ClientType.PUBLIC,
    secretHash: null,
    redirectUris: ['https://app.example.com/callback'],
    grantTypes: [GrantType.AUTHORIZATION_CODE],
    enabled: true,
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
  });
  const user = new User({
    id: 'user-1',
    realmId: realm.id,
    username: 'ana',
    email: 'ana@shop.example',
    emailVerified: true,
    passwordHash: 'hash',
    enabled: true,
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
  });
  const session = new Session({
    id: 'session-1',
    realmId: realm.id,
    userId: user.id,
    tokenHash: 'hash',
    authTime,
    lastSeenAt: TEST_NOW,
    expiresAt: new Date(TEST_NOW.getTime() + 3_600_000),
    createdAt: authTime,
  });

  let keys: InMemorySigningKeyRepository;
  let issuer: IdTokenIssuer;

  beforeEach(() => {
    keys = new InMemorySigningKeyRepository();
    const encryptor = new FakeKeyEncryptor();
    issuer = new IdTokenIssuer(
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
      new FixedClock(),
    );
  });

  async function claimsOf(token: string) {
    const { payload } = await jwtVerify(
      token,
      await importJWK(keys.keys[0].toPublishedJwk(), 'ES256'),
      { currentDate: TEST_NOW },
    );
    return payload;
  }

  it('identifies the user to the client that asked for the login', async () => {
    const token = await issuer.issue({
      realm,
      client,
      user,
      session,
      scopes: ['openid'],
      nonce: 'nonce-1',
    });

    expect(decodeProtectedHeader(token)).toMatchObject({
      alg: 'ES256',
      typ: 'JWT',
    });
    await expect(claimsOf(token)).resolves.toEqual({
      iss: 'https://auth.example.com/realms/shop',
      sub: 'user-1',
      aud: 'web',
      azp: 'web',
      iat: nowSeconds,
      exp: nowSeconds + 600,
      auth_time: authTime.getTime() / 1000,
      sid: 'session-1',
      nonce: 'nonce-1',
    });
  });

  it('adds the profile and email claims only when their scopes are granted', async () => {
    const token = await issuer.issue({
      realm,
      client,
      user,
      session,
      scopes: ['openid', 'profile', 'email'],
      nonce: null,
    });

    const claims = await claimsOf(token);
    expect(claims).toMatchObject({
      preferred_username: 'ana',
      email: 'ana@shop.example',
      email_verified: true,
    });
    expect(claims).not.toHaveProperty('nonce');
  });
});
