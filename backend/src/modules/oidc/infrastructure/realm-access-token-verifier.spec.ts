import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../shared/infrastructure/config/env.schema.js';
import { FixedClock, TEST_NOW } from '../../../shared/testing/test-clock.js';
import { InMemoryRealmRepository } from '../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../realms/testing/realm.fixture.js';
import type { JwtClaims } from '../../signing-keys/application/jwt-signer.js';
import { SigningKey } from '../../signing-keys/domain/entities/signing-key.entity.js';
import { SigningKeyStatus } from '../../signing-keys/domain/signing-key-status.js';
import { JoseEs256KeyPairGenerator } from '../../signing-keys/infrastructure/crypto/jose-es256-key-pair-generator.js';
import { JoseJwtSigner } from '../../signing-keys/infrastructure/crypto/jose-jwt-signer.js';
import { JoseJwtVerifier } from '../../signing-keys/infrastructure/crypto/jose-jwt-verifier.js';
import { InMemorySigningKeyRepository } from '../../signing-keys/testing/in-memory-signing-key.repository.js';
import { ConfigRealmIssuer } from './config-realm-issuer.js';
import { RealmAccessTokenVerifier } from './realm-access-token-verifier.js';

const now = TEST_NOW;
const nowSeconds = now.getTime() / 1000;

describe('RealmAccessTokenVerifier', () => {
  const generator = new JoseEs256KeyPairGenerator();
  const signer = new JoseJwtSigner();
  const realmIssuer = new ConfigRealmIssuer(
    new ConfigService<Env, true>({
      GATEHOUSE_ISSUER: 'https://auth.example.com',
    }),
  );
  const issuer = realmIssuer.forRealm('shop');

  let realms: InMemoryRealmRepository;
  let keys: InMemorySigningKeyRepository;
  let verifier: RealmAccessTokenVerifier;
  let privateKeys: Map<string, string>;

  async function addKey(
    id: string,
    realmId = 'shop-id',
    status: SigningKeyStatus = SigningKeyStatus.ACTIVE,
  ) {
    const { publicJwk, privateKeyPkcs8 } = await generator.generate();
    keys.keys.push(
      new SigningKey({
        id,
        realmId,
        algorithm: 'ES256',
        status,
        publicJwk,
        encryptedPrivateKey: 'unused',
        createdAt: now,
        updatedAt: now,
      }),
    );
    privateKeys.set(id, privateKeyPkcs8);
  }

  const validClaims = (): JwtClaims => ({
    iss: issuer,
    aud: issuer,
    sub: 'client-uuid',
    client_id: 'billing',
    iat: nowSeconds,
    exp: nowSeconds + 300,
  });

  function sign(
    claims: JwtClaims = validClaims(),
    {
      kid = 'key-1',
      signWith = kid,
      typ = 'at+jwt',
    }: { kid?: string; signWith?: string; typ?: string } = {},
  ) {
    return signer.sign({
      privateKeyPkcs8: privateKeys.get(signWith)!,
      algorithm: 'ES256',
      kid,
      typ,
      claims,
    });
  }

  beforeEach(async () => {
    realms = new InMemoryRealmRepository();
    keys = new InMemorySigningKeyRepository();
    privateKeys = new Map();
    verifier = new RealmAccessTokenVerifier(
      realmIssuer,
      realms,
      keys,
      new JoseJwtVerifier(),
      new FixedClock(),
    );
    realms.realms.push(aRealm({ name: 'shop' }), aRealm({ name: 'other' }));
    await addKey('key-1');
  });

  it('turns a valid access token into the principal of its realm', async () => {
    await expect(verifier.verify(await sign())).resolves.toEqual({
      subject: 'client-uuid',
      realm: 'shop',
      clientId: 'billing',
      scopes: [],
    });
  });

  it('accepts a token signed by a passive key of the realm', async () => {
    await addKey('key-0', 'shop-id', SigningKeyStatus.PASSIVE);

    await expect(
      verifier.verify(await sign(validClaims(), { kid: 'key-0' })),
    ).resolves.toMatchObject({ realm: 'shop' });
  });

  it('rejects a token signed by a key other than the one its kid names', async () => {
    await addKey('key-2');

    await expect(
      verifier.verify(await sign(validClaims(), { signWith: 'key-2' })),
    ).resolves.toBeNull();
  });

  it('rejects a kid the realm does not publish', async () => {
    await addKey('other-key', 'other-id');

    await expect(
      verifier.verify(await sign(validClaims(), { kid: 'other-key' })),
    ).resolves.toBeNull();
  });

  it('rejects a token of a disabled realm', async () => {
    realms.realms[0] = aRealm({ name: 'shop', enabled: false });

    await expect(verifier.verify(await sign())).resolves.toBeNull();
  });

  it('rejects a token of an unknown realm', async () => {
    const ghost = realmIssuer.forRealm('ghost');

    await expect(
      verifier.verify(await sign({ ...validClaims(), iss: ghost, aud: ghost })),
    ).resolves.toBeNull();
  });

  it('rejects an issuer outside Gatehouse', async () => {
    const foreign = 'https://evil.example.com/realms/shop';

    await expect(
      verifier.verify(
        await sign({ ...validClaims(), iss: foreign, aud: foreign }),
      ),
    ).resolves.toBeNull();
  });

  it('rejects a token of another type', async () => {
    await expect(
      verifier.verify(await sign(validClaims(), { typ: 'JWT' })),
    ).resolves.toBeNull();
  });

  it('rejects a token meant for another audience', async () => {
    await expect(
      verifier.verify(
        await sign({ ...validClaims(), aud: realmIssuer.forRealm('other') }),
      ),
    ).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    await expect(
      verifier.verify(await sign({ ...validClaims(), exp: nowSeconds - 1 })),
    ).resolves.toBeNull();
  });

  it('rejects a token without client_id', async () => {
    const { client_id: _clientId, ...claims } = validClaims();

    await expect(verifier.verify(await sign(claims))).resolves.toBeNull();
  });

  it('rejects something that is not a JWT', async () => {
    await expect(verifier.verify('not-a-jwt')).resolves.toBeNull();
  });
});
