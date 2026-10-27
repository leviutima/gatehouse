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
});
