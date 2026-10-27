import { WeakPasswordError } from './errors/weak-password.error.js';
import { PasswordPolicy } from './password-policy.js';

describe('PasswordPolicy', () => {
  const policy = new PasswordPolicy(12);

  it('accepts a password at the minimum length', () => {
    expect(() => policy.assertAllowed('a'.repeat(12))).not.toThrow();
  });

  it('rejects a password below the minimum length', () => {
    expect(() => policy.assertAllowed('a'.repeat(11))).toThrow(
      WeakPasswordError,
    );
  });

  it('accepts a password at the maximum length', () => {
    expect(() => policy.assertAllowed('a'.repeat(256))).not.toThrow();
  });

  it('rejects a password above 256 characters', () => {
    expect(() => policy.assertAllowed('a'.repeat(257))).toThrow(
      WeakPasswordError,
    );
  });

  it('counts characters, not UTF-16 code units', () => {
    const twelveEmoji = '🔒'.repeat(12);

    expect(twelveEmoji.length).toBe(24);
    expect(() => new PasswordPolicy(13).assertAllowed(twelveEmoji)).toThrow(
      WeakPasswordError,
    );
  });

  it('does not demand uppercase, digits or symbols', () => {
    expect(() =>
      policy.assertAllowed('correct horse battery staple'),
    ).not.toThrow();
  });
});
