import { InvalidClientConfigurationError } from './errors/invalid-client-configuration.error.js';
import { assertValidRedirectUri } from './redirect-uri.js';

describe('assertValidRedirectUri', () => {
  it.each([
    'https://app.example.com/callback',
    'https://app.example.com/callback?tenant=1',
    'http://localhost:3000/callback',
    'http://127.0.0.1:8080/callback',
    'http://[::1]:8080/callback',
    'myapp://callback',
    'com.example.app:/oauth2redirect',
  ])('accepts %s', (uri) => {
    expect(() => assertValidRedirectUri(uri)).not.toThrow();
  });

  it.each([
    ['relative', '/callback'],
    ['empty', ''],
    ['with a fragment', 'https://app.example.com/callback#done'],
    ['with an empty fragment', 'https://app.example.com/callback#'],
    ['plain http on a public host', 'http://app.example.com/callback'],
    ['plain http on a localhost lookalike', 'http://localhost.evil.com/cb'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/html,hi'],
    ['file scheme', 'file:///etc/passwd'],
  ])('rejects a URI %s', (_case, uri) => {
    expect(() => assertValidRedirectUri(uri)).toThrow(
      InvalidClientConfigurationError,
    );
  });
});
