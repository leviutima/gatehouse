import { Injectable } from '@nestjs/common';
import {
  decodeJwt,
  decodeProtectedHeader,
  errors,
  importJWK,
  jwtVerify,
} from 'jose';
import type { JwtClaims } from '../../application/jwt-signer.js';
import {
  JwtVerifier,
  JwtVerifyInput,
  UnverifiedJwt,
} from '../../application/jwt-verifier.js';

@Injectable()
export class JoseJwtVerifier extends JwtVerifier {
  decode(token: string): UnverifiedJwt | null {
    try {
      const { kid } = decodeProtectedHeader(token);
      return { kid, claims: decodeJwt(token) };
    } catch {
      return null;
    }
  }

  async verify({
    token,
    publicJwk,
    algorithm,
    typ,
    issuer,
    audience,
    currentDate,
  }: JwtVerifyInput): Promise<JwtClaims | null> {
    try {
      const key = await importJWK(publicJwk, algorithm);
      const { payload } = await jwtVerify(token, key, {
        algorithms: [algorithm],
        typ,
        issuer,
        audience,
        currentDate,
        requiredClaims: ['exp'],
      });
      return payload;
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        return null;
      }
      throw error;
    }
  }
}
