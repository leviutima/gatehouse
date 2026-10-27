import { Injectable } from '@nestjs/common';
import { KeyEncryptor } from '../../../../shared/application/crypto/key-encryptor.js';
import type { SigningKey } from '../../domain/entities/signing-key.entity.js';
import { SigningKeyRepository } from '../../domain/repositories/signing-key.repository.js';
import { SigningKeyStatus } from '../../domain/signing-key-status.js';
import { KeyPairGenerator } from '../key-pair-generator.js';

@Injectable()
export class EnsureActiveSigningKeyUseCase {
  constructor(
    private readonly keys: SigningKeyRepository,
    private readonly generator: KeyPairGenerator,
    private readonly encryptor: KeyEncryptor,
  ) {}

  async execute(realmId: string): Promise<SigningKey> {
    const active = await this.keys.findActive(realmId);
    if (active) {
      return active;
    }

    const { publicJwk, privateKeyPkcs8 } = await this.generator.generate();

    return this.keys.create({
      realmId,
      algorithm: this.generator.algorithm,
      status: SigningKeyStatus.ACTIVE,
      publicJwk,
      encryptedPrivateKey: this.encryptor.encrypt(privateKeyPkcs8),
    });
  }
}
