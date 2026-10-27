import type { SigningKey } from '../entities/signing-key.entity.js';
import type { EcPublicJwk } from '../jwk.js';
import type { SigningKeyStatus } from '../signing-key-status.js';

export interface CreateSigningKeyData {
  realmId: string;
  algorithm: string;
  status: SigningKeyStatus;
  publicJwk: EcPublicJwk;
  encryptedPrivateKey: string;
}

export abstract class SigningKeyRepository {
  abstract findActive(realmId: string): Promise<SigningKey | null>;
  abstract findPublished(realmId: string): Promise<SigningKey[]>;
  abstract create(data: CreateSigningKeyData): Promise<SigningKey>;
}
