import {
  assertValidClientId,
  assertValidClientName,
} from './client-identity.js';
import { InvalidClientConfigurationError } from './errors/invalid-client-configuration.error.js';

describe('assertValidClientId', () => {
  it.each([
    'billing',
    'admin-console',
    'shop.web',
    'api:orders',
    'a'.repeat(100),
  ])('accepts %s', (clientId) => {
    expect(() => assertValidClientId(clientId)).not.toThrow();
  });

  it.each(['', 'my client', '-billing', 'billing/web', 'a'.repeat(101)])(
    'rejects "%s"',
    (clientId) => {
      expect(() => assertValidClientId(clientId)).toThrow(
        InvalidClientConfigurationError,
      );
    },
  );
});

describe('assertValidClientName', () => {
  it('accepts a name of up to 100 characters', () => {
    expect(() => assertValidClientName('a'.repeat(100))).not.toThrow();
  });

  it.each(['', '   ', 'a'.repeat(101)])('rejects "%s"', (name) => {
    expect(() => assertValidClientName(name)).toThrow(
      InvalidClientConfigurationError,
    );
  });
});
