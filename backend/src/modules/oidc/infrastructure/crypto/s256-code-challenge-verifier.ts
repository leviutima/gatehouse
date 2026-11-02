import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CodeChallengeVerifier } from '../../application/code-challenge-verifier.js';

const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

@Injectable()
export class S256CodeChallengeVerifier extends CodeChallengeVerifier {
  matches(codeVerifier: string, codeChallenge: string): boolean {
    if (!CODE_VERIFIER_PATTERN.test(codeVerifier)) {
      return false;
    }
    const computed = Buffer.from(
      createHash('sha256').update(codeVerifier, 'ascii').digest('base64url'),
    );
    const expected = Buffer.from(codeChallenge);
    return (
      computed.length === expected.length && timingSafeEqual(computed, expected)
    );
  }
}
