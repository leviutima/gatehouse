import { SigningKeyStatus } from '../signing-key-status.js';
import { SigningKey, SigningKeyProps } from './signing-key.entity.js';

function signingKey(overrides: Partial<SigningKeyProps> = {}): SigningKey {
  return new SigningKey({
    id: 'key-1',
    realmId: 'realm-1',
    algorithm: 'ES256',
    status: SigningKeyStatus.ACTIVE,
    publicJwk: { kty: 'EC', crv: 'P-256', x: 'x-coord', y: 'y-coord' },
    encryptedPrivateKey: 'v1.iv.tag.ciphertext',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('SigningKey', () => {
  it('knows whether it is the active key', () => {
    expect(signingKey().isActive).toBe(true);
    expect(signingKey({ status: SigningKeyStatus.PASSIVE }).isActive).toBe(
      false,
    );
  });

  it('uses its id as kid', () => {
    expect(signingKey().kid).toBe('key-1');
  });

  it('publishes only the public JWK members plus kid, alg and use', () => {
    const jwk = signingKey({
      publicJwk: {
        kty: 'EC',
        crv: 'P-256',
        x: 'x-coord',
        y: 'y-coord',
        d: 'private-scalar',
      } as SigningKeyProps['publicJwk'],
    }).toPublishedJwk();

    expect(jwk).toEqual({
      kty: 'EC',
      crv: 'P-256',
      x: 'x-coord',
      y: 'y-coord',
      kid: 'key-1',
      alg: 'ES256',
      use: 'sig',
    });
  });
});
