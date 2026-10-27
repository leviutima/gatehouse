export type JwtClaims = Record<string, unknown>;

export interface JwtSignInput {
  privateKeyPkcs8: string;
  algorithm: string;
  kid: string;
  typ: string;
  claims: JwtClaims;
}

export abstract class JwtSigner {
  abstract sign(input: JwtSignInput): Promise<string>;
}
