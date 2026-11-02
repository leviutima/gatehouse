import { FakeKeyEncryptor } from '../../../../shared/testing/fake-key-encryptor.js';
import { FixedClock, TEST_NOW } from '../../../../shared/testing/test-clock.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import type { JwtClaims } from '../../../signing-keys/application/jwt-signer.js';
import { RealmTokenSigner } from '../../../signing-keys/application/services/realm-token-signer.js';
import { SigningKeyProvisioner } from '../../../signing-keys/application/services/signing-key-provisioner.js';
import { JoseEs256KeyPairGenerator } from '../../../signing-keys/infrastructure/crypto/jose-es256-key-pair-generator.js';
import { JoseJwtSigner } from '../../../signing-keys/infrastructure/crypto/jose-jwt-signer.js';
import { JoseJwtVerifier } from '../../../signing-keys/infrastructure/crypto/jose-jwt-verifier.js';
import { InMemorySigningKeyRepository } from '../../../signing-keys/testing/in-memory-signing-key.repository.js';
import { RealmIssuer } from '../realm-issuer.js';
import { IdTokenHintReader } from './id-token-hint-reader.js';

const nowSeconds = TEST_NOW.getTime() / 1000;

class FakeRealmIssuer extends RealmIssuer {
  forRealm(realmName: string): string {
    return `https://auth.example.com/realms/${realmName}`;
  }

  realmNameOf(): string | null {
    return null;
  }
}

describe('IdTokenHintReader', () => {
  const shop = aRealm({ name: 'shop' });
  const other = aRealm({ name: 'other' });

  let signer: RealmTokenSigner;
  let reader: IdTokenHintReader;

  const claims = (overrides: JwtClaims = {}): JwtClaims => ({
    iss: 'https://auth.example.com/realms/shop',
    sub: 'user-1',
    aud: 'web',
    sid: 'session-1',
    iat: nowSeconds - 7200,
    exp: nowSeconds - 3600,
    ...overrides,
  });

  beforeEach(() => {
    const keys = new InMemorySigningKeyRepository();
    const encryptor = new FakeKeyEncryptor();
    signer = new RealmTokenSigner(
      new SigningKeyProvisioner(
        keys,
        new JoseEs256KeyPairGenerator(),
        encryptor,
      ),
      encryptor,
      new JoseJwtSigner(),
    );
    reader = new IdTokenHintReader(
      new FakeRealmIssuer(),
      keys,
      new JoseJwtVerifier(),
      new FixedClock(),
    );
  });

  it('reads the client, user and session of an expired id token', async () => {
    const hint = await signer.sign(shop.id, 'JWT', claims());

    await expect(reader.read(shop, hint)).resolves.toEqual({
      clientId: 'web',
      subject: 'user-1',
      sessionId: 'session-1',
    });
  });

  it('refuses an access token as a hint', async () => {
    const hint = await signer.sign(shop.id, 'at+jwt', claims());

    await expect(reader.read(shop, hint)).resolves.toBeNull();
  });

  it('refuses an id token of another realm', async () => {
    const hint = await signer.sign(other.id, 'JWT', {
      ...claims(),
      iss: 'https://auth.example.com/realms/other',
    });

    await expect(reader.read(shop, hint)).resolves.toBeNull();
  });

  it('refuses something that is not a JWT', async () => {
    await expect(reader.read(shop, 'not-a-jwt')).resolves.toBeNull();
  });
});
