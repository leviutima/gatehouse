import { argon2id, hash } from 'argon2';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('produces an argon2id PHC string with the configured parameters', async () => {
    const digest = await hasher.hash('correct horse battery staple');

    expect(digest).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
  });

  it('never returns the password itself', async () => {
    const digest = await hasher.hash('s3cret-password');

    expect(digest).not.toContain('s3cret-password');
  });

  it('salts every hash, so the same password gives different digests', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('same-password'),
      hasher.hash('same-password'),
    ]);

    expect(first).not.toBe(second);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const digest = await hasher.hash('right-password');

    await expect(hasher.verify(digest, 'right-password')).resolves.toBe(true);
    await expect(hasher.verify(digest, 'wrong-password')).resolves.toBe(false);
  });

  it('treats a malformed digest as a failed verification', async () => {
    await expect(hasher.verify('not-a-hash', 'anything')).resolves.toBe(false);
  });

  it('flags digests made with weaker parameters for rehash', async () => {
    const current = await hasher.hash('password');
    const weaker = await hash('password', {
      type: argon2id,
      memoryCost: 8192,
      timeCost: 1,
      parallelism: 1,
    });

    expect(hasher.needsRehash(current)).toBe(false);
    expect(hasher.needsRehash(weaker)).toBe(true);
  });
});
