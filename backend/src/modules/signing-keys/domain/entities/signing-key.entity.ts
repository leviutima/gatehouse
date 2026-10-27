import type { EcPublicJwk, PublishedJwk } from '../jwk.js';
import { SigningKeyStatus } from '../signing-key-status.js';

export interface SigningKeyProps {
  id: string;
  realmId: string;
  algorithm: string;
  status: SigningKeyStatus;
  publicJwk: EcPublicJwk;
  encryptedPrivateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SigningKey {
  readonly id: string;
  readonly realmId: string;
  readonly algorithm: string;
  readonly status: SigningKeyStatus;
  readonly publicJwk: EcPublicJwk;
  readonly encryptedPrivateKey: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: SigningKeyProps) {
    this.id = props.id;
    this.realmId = props.realmId;
    this.algorithm = props.algorithm;
    this.status = props.status;
    this.publicJwk = props.publicJwk;
    this.encryptedPrivateKey = props.encryptedPrivateKey;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get isActive(): boolean {
    return this.status === SigningKeyStatus.ACTIVE;
  }

  get kid(): string {
    return this.id;
  }

  toPublishedJwk(): PublishedJwk {
    return {
      kty: this.publicJwk.kty,
      crv: this.publicJwk.crv,
      x: this.publicJwk.x,
      y: this.publicJwk.y,
      kid: this.kid,
      alg: this.algorithm,
      use: 'sig',
    };
  }
}
