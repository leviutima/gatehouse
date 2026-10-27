import { RandomSecretGenerator } from './random-secret-generator.js';

describe('RandomSecretGenerator', () => {
  const generator = new RandomSecretGenerator();

  it('produces 256 bits encoded as base64url', () => {
    const secret = generator.generate();

    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(secret, 'base64url')).toHaveLength(32);
  });

  it('never repeats a secret', () => {
    const secrets = new Set(
      Array.from({ length: 100 }, () => generator.generate()),
    );

    expect(secrets.size).toBe(100);
  });
});
