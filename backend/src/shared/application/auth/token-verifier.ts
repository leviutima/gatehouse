import type { Principal } from './principal.js';

export abstract class TokenVerifier {
  abstract verify(token: string): Promise<Principal | null>;
}
