import type { EcPublicJwk } from '../domain/jwk.js';

export interface GeneratedKeyPair {
  publicJwk: EcPublicJwk;
  privateKeyPkcs8: string;
}

export abstract class KeyPairGenerator {
  abstract readonly algorithm: string;
  abstract generate(): Promise<GeneratedKeyPair>;
}
