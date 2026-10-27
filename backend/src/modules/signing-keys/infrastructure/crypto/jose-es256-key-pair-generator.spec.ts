import { CompactSign, compactVerify, importJWK, importPKCS8 } from 'jose';
import { JoseEs256KeyPairGenerator } from './jose-es256-key-pair-generator.js';

describe('JoseEs256KeyPairGenerator', () => {
  const generator = new JoseEs256KeyPairGenerator();

  it('exports only the public members of a P-256 key', async () => {
    const { publicJwk } = await generator.generate();

    expect(Object.keys(publicJwk).sort()).toEqual(['crv', 'kty', 'x', 'y']);
    expect(publicJwk).toMatchObject({ kty: 'EC', crv: 'P-256' });
  });

  it('exports the private key as PKCS#8 PEM', async () => {
    const { privateKeyPkcs8 } = await generator.generate();

    expect(privateKeyPkcs8).toMatch(
      /^-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----\n?$/,
    );
  });

  it('returns a pair whose private key signs what the public key verifies', async () => {
    const { publicJwk, privateKeyPkcs8 } = await generator.generate();
    const payload = new TextEncoder().encode('hello');

    const jws = await new CompactSign(payload)
      .setProtectedHeader({ alg: 'ES256' })
      .sign(await importPKCS8(privateKeyPkcs8, 'ES256'));
    const { payload: verified } = await compactVerify(
      jws,
      await importJWK(publicJwk, 'ES256'),
    );

    expect(new TextDecoder().decode(verified)).toBe('hello');
  });

  it('generates a different key pair every time', async () => {
    const [first, second] = await Promise.all([
      generator.generate(),
      generator.generate(),
    ]);

    expect(first.publicJwk.x).not.toBe(second.publicJwk.x);
  });
});
