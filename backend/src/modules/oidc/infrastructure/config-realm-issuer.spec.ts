import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../shared/infrastructure/config/env.schema.js';
import { ConfigRealmIssuer } from './config-realm-issuer.js';

describe('ConfigRealmIssuer', () => {
  const issuer = new ConfigRealmIssuer(
    new ConfigService<Env, true>({
      GATEHOUSE_ISSUER: 'https://auth.example.com',
    }),
  );

  it('builds the realm issuer under /realms', () => {
    expect(issuer.forRealm('shop')).toBe(
      'https://auth.example.com/realms/shop',
    );
  });

  it('encodes the realm name as one path segment', () => {
    expect(issuer.forRealm('a/b c')).toBe(
      'https://auth.example.com/realms/a%2Fb%20c',
    );
  });

  it.each(['shop', 'a/b c'])(
    'reads the realm name back from its issuer: %s',
    (realmName) => {
      expect(issuer.realmNameOf(issuer.forRealm(realmName))).toBe(realmName);
    },
  );

  it.each([
    ['another host', 'https://evil.example.com/realms/shop'],
    ['a host sharing the prefix', 'https://auth.example.com.evil/realms/shop'],
    ['no realm name', 'https://auth.example.com/realms/'],
    ['an extra path segment', 'https://auth.example.com/realms/shop/extra'],
    ['a non-canonical encoding', 'https://auth.example.com/realms/%73hop'],
    ['a malformed encoding', 'https://auth.example.com/realms/%E0%A4%A'],
  ])('rejects an issuer with %s', (_case, value) => {
    expect(issuer.realmNameOf(value)).toBeNull();
  });
});
