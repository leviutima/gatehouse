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
    acceptExpired = false,
  }: JwtVerifyInput): Promise<JwtClaims | null> {
    try {
      const key = await importJWK(publicJwk, algorithm);
      const { payload } = await jwtVerify(token, key, {
        algorithms: [algorithm],
        typ,
        issuer,
        audience,
        currentDate: acceptExpired
          ? beforeExpiry(token, currentDate)
          : currentDate,
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

function beforeExpiry(token: string, currentDate: Date): Date {
  const { exp } = decodeJwt(token);
  return typeof exp === 'number'
    ? new Date(Math.min(currentDate.getTime(), exp * 1000 - 1000))
    : currentDate;
}
