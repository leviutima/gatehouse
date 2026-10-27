import type { EcPublicJwk } from '../domain/jwk.js';
import type { JwtClaims } from './jwt-signer.js';

export interface UnverifiedJwt {
  kid: string | undefined;
  claims: JwtClaims;
}

export interface JwtVerifyInput {
  token: string;
  publicJwk: EcPublicJwk;
  algorithm: string;
  typ: string;
  issuer: string;
  audience: string;
  currentDate: Date;
}

export abstract class JwtVerifier {
  abstract decode(token: string): UnverifiedJwt | null;
  abstract verify(input: JwtVerifyInput): Promise<JwtClaims | null>;
}
