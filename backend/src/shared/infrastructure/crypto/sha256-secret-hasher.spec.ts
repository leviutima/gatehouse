import { Sha256SecretHasher } from './sha256-secret-hasher.js';

describe('Sha256SecretHasher', () => {
  const hasher = new Sha256SecretHasher();

  it('produces a prefixed base64url SHA-256 digest', () => {
    expect(hasher.hash('abc')).toBe(
      'sha256$ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0',
    );
  });

  it('never returns the secret itself', () => {
    expect(hasher.hash('s3cret-value')).not.toContain('s3cret-value');
  });

  it('verifies the right secret and rejects a wrong one', () => {
    const digest = hasher.hash('right-secret');

    expect(hasher.verify(digest, 'right-secret')).toBe(true);
    expect(hasher.verify(digest, 'wrong-secret')).toBe(false);
  });

  it('treats a malformed digest as a failed verification', () => {
    expect(hasher.verify('not-a-hash', 'anything')).toBe(false);
  });
});
