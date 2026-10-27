import { ConfigService } from '@nestjs/config';
import { Clock } from '../../../shared/application/time/clock.js';
import type { Env } from '../../../shared/infrastructure/config/env.schema.js';
import { Realm } from '../../realms/domain/entities/realm.entity.js';
import { LoginIdentifier } from '../../realms/domain/login-identifier.js';
import {
  CreateRealmData,
  RealmRepository,
} from '../../realms/domain/repositories/realm.repository.js';
import type { JwtClaims } from '../../signing-keys/application/jwt-signer.js';
import { SigningKey } from '../../signing-keys/domain/entities/signing-key.entity.js';
import {
  CreateSigningKeyData,
  SigningKeyRepository,
} from '../../signing-keys/domain/repositories/signing-key.repository.js';
import { SigningKeyStatus } from '../../signing-keys/domain/signing-key-status.js';
import { JoseEs256KeyPairGenerator } from '../../signing-keys/infrastructure/crypto/jose-es256-key-pair-generator.js';
import { JoseJwtSigner } from '../../signing-keys/infrastructure/crypto/jose-jwt-signer.js';
import { JoseJwtVerifier } from '../../signing-keys/infrastructure/crypto/jose-jwt-verifier.js';
import { ConfigRealmIssuer } from './config-realm-issuer.js';
import { RealmAccessTokenVerifier } from './realm-access-token-verifier.js';

const now = new Date('2026-10-27T12:00:00Z');
const nowSeconds = now.getTime() / 1000;

class InMemoryRealmRepository extends RealmRepository {
  readonly realms: Realm[] = [];

  findByName(name: string): Promise<Realm | null> {
    return Promise.resolve(
      this.realms.find((realm) => realm.name === name) ?? null,
    );
  }

  list(): Promise<Realm[]> {
    return Promise.resolve([...this.realms]);
  }

  update(): Promise<Realm> {
    return Promise.reject(new Error('not used'));
  }

  create(_data: CreateRealmData): Promise<Realm> {
    return Promise.reject(new Error('not used'));
  }
}

class InMemorySigningKeyRepository extends SigningKeyRepository {
  readonly keys: SigningKey[] = [];

  findActive(realmId: string): Promise<SigningKey | null> {
    return Promise.resolve(
      this.keys.find((key) => key.realmId === realmId && key.isActive) ?? null,
    );
  }

  findPublished(realmId: string): Promise<SigningKey[]> {
    return Promise.resolve(this.keys.filter((key) => key.realmId === realmId));
  }

  create(_data: CreateSigningKeyData): Promise<SigningKey> {
    return Promise.reject(new Error('not used'));
  }
}

class FixedClock extends Clock {
  now(): Date {
    return now;
  }
}

function realm(name: string, enabled = true): Realm {
  return new Realm({
    id: `${name}-id`,
    name,
    displayName: name,
    enabled,
    loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
    passwordMinLength: 12,
    accessTokenLifespan: 300,
    createdAt: now,
    updatedAt: now,
  });
}

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
    realms.realms.push(realm('shop'), realm('other'));
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
    realms.realms[0] = realm('shop', false);

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
