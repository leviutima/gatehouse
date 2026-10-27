import { Injectable } from '@nestjs/common';
import { KeyEncryptor } from '../../../../shared/application/crypto/key-encryptor.js';
import { JwtClaims, JwtSigner } from '../jwt-signer.js';
import { SigningKeyProvisioner } from './signing-key-provisioner.js';

@Injectable()
export class RealmTokenSigner {
  constructor(
    private readonly signingKeyProvisioner: SigningKeyProvisioner,
    private readonly encryptor: KeyEncryptor,
    private readonly jwtSigner: JwtSigner,
  ) {}

  async sign(realmId: string, typ: string, claims: JwtClaims): Promise<string> {
    const key = await this.signingKeyProvisioner.ensureActive(realmId);
    return this.jwtSigner.sign({
      privateKeyPkcs8: this.encryptor.decrypt(key.encryptedPrivateKey),
      algorithm: key.algorithm,
      kid: key.kid,
      typ,
      claims,
    });
  }
}
