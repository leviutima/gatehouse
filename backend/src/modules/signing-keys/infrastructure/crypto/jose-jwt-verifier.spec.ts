import type { JwtClaims } from '../../application/jwt-signer.js';
import type { JwtVerifyInput } from '../../application/jwt-verifier.js';
import { JoseEs256KeyPairGenerator } from './jose-es256-key-pair-generator.js';
import { JoseJwtSigner } from './jose-jwt-signer.js';
import { JoseJwtVerifier } from './jose-jwt-verifier.js';

const now = new Date('2026-10-27T12:00:00Z');
const nowSeconds = now.getTime() / 1000;
const issuer = 'https://auth.example.com/realms/shop';

const base64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

describe('JoseJwtVerifier', () => {
  const verifier = new JoseJwtVerifier();
  const signer = new JoseJwtSigner();
  const generator = new JoseEs256KeyPairGenerator();

  let keyPair: Awaited<ReturnType<JoseEs256KeyPairGenerator['generate']>>;

  beforeAll(async () => {
    keyPair = await generator.generate();
  });

  const validClaims = (): JwtClaims => ({
    iss: issuer,
    aud: issuer,
    sub: 'client-1',
    iat: nowSeconds,
    exp: nowSeconds + 300,
  });

  const sign = (claims: JwtClaims, typ = 'at+jwt') =>
    signer.sign({
      privateKeyPkcs8: keyPair.privateKeyPkcs8,
      algorithm: 'ES256',
      kid: 'key-1',
      typ,
      claims,
    });

  const verify = (token: string, overrides: Partial<JwtVerifyInput> = {}) =>
    verifier.verify({
      token,
      publicJwk: keyPair.publicJwk,
      algorithm: 'ES256',
      typ: 'at+jwt',
      issuer,
      audience: issuer,
      currentDate: now,
      ...overrides,
    });

  it('decodes the kid and the claims without verifying', async () => {
    const token = await sign(validClaims());

    expect(verifier.decode(token)).toEqual({
      kid: 'key-1',
      claims: validClaims(),
    });
  });

  it('returns null when decoding something that is not a JWT', () => {
    expect(verifier.decode('not-a-jwt')).toBeNull();
  });

  it('returns the claims of a valid token', async () => {
    const token = await sign(validClaims());

    await expect(verify(token)).resolves.toEqual(validClaims());
  });

  it('rejects a token signed by another key', async () => {
    const other = await generator.generate();
    const token = await sign(validClaims());

    await expect(
      verify(token, { publicJwk: other.publicJwk }),
    ).resolves.toBeNull();
  });

  it('rejects an unsigned token', async () => {
    const token = `${base64url({ alg: 'none', typ: 'at+jwt' })}.${base64url(validClaims())}.`;

    await expect(verify(token)).resolves.toBeNull();
  });

  it('rejects another token type', async () => {
    const token = await sign(validClaims(), 'JWT');

    await expect(verify(token)).resolves.toBeNull();
  });

  it.each([
    ['issuer', { iss: 'https://evil.example.com/realms/shop' }],
    ['audience', { aud: 'https://api.example.com' }],
  ])('rejects a wrong %s', async (_case, overrides) => {
    const token = await sign({ ...validClaims(), ...overrides });

    await expect(verify(token)).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await sign({ ...validClaims(), exp: nowSeconds - 1 });

    await expect(verify(token)).resolves.toBeNull();
  });

  it('rejects a token without exp', async () => {
    const { exp: _exp, ...claims } = validClaims();
    const token = await sign(claims);

    await expect(verify(token)).resolves.toBeNull();
  });
});
