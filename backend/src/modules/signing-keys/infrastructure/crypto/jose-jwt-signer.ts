import { Injectable } from '@nestjs/common';
import { importPKCS8, SignJWT } from 'jose';
import { JwtSignInput, JwtSigner } from '../../application/jwt-signer.js';

@Injectable()
export class JoseJwtSigner extends JwtSigner {
  async sign({
    privateKeyPkcs8,
    algorithm,
    kid,
    typ,
    claims,
  }: JwtSignInput): Promise<string> {
    const privateKey = await importPKCS8(privateKeyPkcs8, algorithm);
    return new SignJWT(claims)
      .setProtectedHeader({ alg: algorithm, kid, typ })
      .sign(privateKey);
  }
}
