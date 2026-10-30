import { OAuthError } from '../../application/errors/oauth.error.js';
import {
  assertFormEncoded,
  parseTokenRequest,
  resolveClientCredentials,
} from './token-request.parser.js';

function basic(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

function oauthCode(work: () => unknown): string | undefined {
  try {
    work();
  } catch (error) {
    return error instanceof OAuthError ? error.code : 'not-oauth';
  }
  return undefined;
}

describe('assertFormEncoded', () => {
  it.each([
    'application/x-www-form-urlencoded',
    'application/x-www-form-urlencoded; charset=UTF-8',
    'Application/X-WWW-Form-Urlencoded',
  ])('accepts %s', (contentType) => {
    expect(() => assertFormEncoded(contentType)).not.toThrow();
  });

  it.each([undefined, 'application/json', 'multipart/form-data'])(
    'rejects %s',
    (contentType) => {
      expect(oauthCode(() => assertFormEncoded(contentType))).toBe(
        'invalid_request',
      );
    },
  );
});

describe('parseTokenRequest', () => {
  it('keeps the known parameters and drops unknown ones', () => {
    expect(
      parseTokenRequest({ grant_type: 'client_credentials', extra: 'x' }),
    ).toEqual({ grant_type: 'client_credentials' });
  });

  it.each([
    ['a missing grant_type', {}],
    ['a repeated grant_type', { grant_type: ['a', 'b'] }],
    ['an empty client_id', { grant_type: 'x', client_id: '' }],
    ['a non-object body', undefined],
  ])('rejects %s', (_case, body) => {
    expect(oauthCode(() => parseTokenRequest(body))).toBe('invalid_request');
  });
});

describe('resolveClientCredentials', () => {
  const request = { grant_type: 'client_credentials' };

  it('reads client_secret_basic credentials', () => {
    expect(
      resolveClientCredentials(basic('billing', 's3cret'), request),
    ).toEqual({ clientId: 'billing', clientSecret: 's3cret' });
  });

  it('form-decodes client_secret_basic credentials', () => {
    expect(
      resolveClientCredentials(basic('my%3Aclient', 'a+b%2Bc'), request),
    ).toEqual({ clientId: 'my:client', clientSecret: 'a b+c' });
  });

  it('keeps a colon inside the secret', () => {
    expect(resolveClientCredentials(basic('billing', 'a:b'), request)).toEqual({
      clientId: 'billing',
      clientSecret: 'a:b',
    });
  });

  it('reads client_secret_post credentials', () => {
    expect(
      resolveClientCredentials(undefined, {
        ...request,
        client_id: 'billing',
        client_secret: 's3cret',
      }),
    ).toEqual({ clientId: 'billing', clientSecret: 's3cret' });
  });

  it('reads a client_id without a secret as a public client', () => {
    expect(
      resolveClientCredentials(undefined, { ...request, client_id: 'web' }),
    ).toEqual({ clientId: 'web', clientSecret: null });
  });

  it('accepts a matching client_id alongside client_secret_basic', () => {
    expect(
      resolveClientCredentials(basic('billing', 's3cret'), {
        ...request,
        client_id: 'billing',
      }),
    ).toEqual({ clientId: 'billing', clientSecret: 's3cret' });
  });

  it.each<[string, string | undefined, Record<string, string>, string]>([
    [
      'both authentication methods',
      basic('billing', 's3cret'),
      { client_secret: 's3cret' },
      'invalid_request',
    ],
    [
      'a client_id that differs from the basic one',
      basic('billing', 's3cret'),
      { client_id: 'other' },
      'invalid_request',
    ],
    ['no credentials', undefined, {}, 'invalid_client'],
    [
      'a basic header without a colon',
      `Basic ${Buffer.from('billing').toString('base64')}`,
      {},
      'invalid_client',
    ],
    [
      'a basic header with an empty client_id',
      basic('', 's3cret'),
      {},
      'invalid_client',
    ],
    [
      'a basic header with a broken escape',
      basic('bill%ZZ', 's3cret'),
      {},
      'invalid_client',
    ],
    ['an empty basic header', 'Basic', {}, 'invalid_client'],
  ])('rejects %s', (_case, authorization, extra, code) => {
    expect(
      oauthCode(() =>
        resolveClientCredentials(authorization, { ...request, ...extra }),
      ),
    ).toBe(code);
  });

  it('ignores a non-basic authorization header', () => {
    expect(
      resolveClientCredentials('Bearer abc', {
        ...request,
        client_id: 'billing',
        client_secret: 's3cret',
      }),
    ).toEqual({ clientId: 'billing', clientSecret: 's3cret' });
  });
});
