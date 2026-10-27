import { Injectable } from '@nestjs/common';
import type { Principal } from '../../application/auth/principal.js';
import { TokenVerifier } from '../../application/auth/token-verifier.js';

@Injectable()
export class DenyAllTokenVerifier extends TokenVerifier {
  verify(): Promise<Principal | null> {
    return Promise.resolve(null);
  }
}
