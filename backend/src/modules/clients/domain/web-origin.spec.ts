import { InvalidClientConfigurationError } from './errors/invalid-client-configuration.error.js';
import { assertValidWebOrigin } from './web-origin.js';

describe('assertValidWebOrigin', () => {
  it.each([
    'https://app.example.com',
    'https://app.example.com:8443',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
  ])('accepts %s', (origin) => {
    expect(() => assertValidWebOrigin(origin)).not.toThrow();
  });

  it.each([
    ['a path', 'https://app.example.com/console'],
    ['a trailing slash', 'https://app.example.com/'],
    ['a query', 'https://app.example.com?x=1'],
    ['plain http outside localhost', 'http://app.example.com'],
    ['another scheme', 'ftp://app.example.com'],
    ['a wildcard', '*'],
    ['a relative value', 'app.example.com'],
  ])('rejects %s', (_case, origin) => {
    expect(() => assertValidWebOrigin(origin)).toThrow(
      InvalidClientConfigurationError,
    );
  });
});
