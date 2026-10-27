import { Injectable } from '@nestjs/common';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';
import {
  GeneratedKeyPair,
  KeyPairGenerator,
} from '../../application/key-pair-generator.js';

@Injectable()
export class JoseEs256KeyPairGenerator extends KeyPairGenerator {
  readonly algorithm = 'ES256';

  async generate(): Promise<GeneratedKeyPair> {
    const { publicKey, privateKey } = await generateKeyPair(this.algorithm, {
      extractable: true,
    });
    const { kty, crv, x, y } = await exportJWK(publicKey);
    if (kty !== 'EC' || crv !== 'P-256' || !x || !y) {
      throw new Error('Unexpected ES256 public key shape');
    }
    return {
      publicJwk: { kty: 'EC', crv: 'P-256', x, y },
      privateKeyPkcs8: await exportPKCS8(privateKey),
    };
  }
}
