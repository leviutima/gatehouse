import {
  GeneratedKeyPair,
  KeyPairGenerator,
} from '../application/key-pair-generator.js';

export class FakeKeyPairGenerator extends KeyPairGenerator {
  readonly algorithm = 'ES256';
  readonly generate = vi.fn((): Promise<GeneratedKeyPair> =>
    Promise.resolve({
      publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
      privateKeyPkcs8: 'private-pem',
    }),
  );
}
