import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose';
import { JoseEs256KeyPairGenerator } from './jose-es256-key-pair-generator.js';
import { JoseJwtSigner } from './jose-jwt-signer.js';

describe('JoseJwtSigner', () => {
  const signer = new JoseJwtSigner();
  const generator = new JoseEs256KeyPairGenerator();

  it('signs the claims so that the matching public key verifies them', async () => {
    const { publicJwk, privateKeyPkcs8 } = await generator.generate();

    const jwt = await signer.sign({
      privateKeyPkcs8,
      algorithm: 'ES256',
      kid: 'key-1',
      typ: 'at+jwt',
      claims: { sub: 'client-1', client_id: 'billing' },
    });

    const { payload } = await jwtVerify(
      jwt,
      await importJWK(publicJwk, 'ES256'),
    );
    expect(payload).toEqual({ sub: 'client-1', client_id: 'billing' });
  });

  it('puts alg, kid and typ in the protected header', async () => {
    const { privateKeyPkcs8 } = await generator.generate();

    const jwt = await signer.sign({
      privateKeyPkcs8,
      algorithm: 'ES256',
      kid: 'key-1',
      typ: 'at+jwt',
      claims: {},
    });

    expect(decodeProtectedHeader(jwt)).toEqual({
      alg: 'ES256',
      kid: 'key-1',
      typ: 'at+jwt',
    });
  });

  it('fails when the verifier holds a different key', async () => {
    const signing = await generator.generate();
    const other = await generator.generate();

    const jwt = await signer.sign({
      privateKeyPkcs8: signing.privateKeyPkcs8,
      algorithm: 'ES256',
      kid: 'key-1',
      typ: 'at+jwt',
      claims: {},
    });

    await expect(
      jwtVerify(jwt, await importJWK(other.publicJwk, 'ES256')),
    ).rejects.toThrow();
  });
});
