import type { AuthorizationCode } from '../entities/authorization-code.entity.js';

export interface CreateAuthorizationCodeData {
  realmId: string;
  codeHash: string;
  clientId: string;
  userId: string;
  sessionId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  nonce: string | null;
  expiresAt: Date;
}

export abstract class AuthorizationCodeRepository {
  abstract findByCodeHash(codeHash: string): Promise<AuthorizationCode | null>;
  abstract markConsumed(id: string, consumedAt: Date): Promise<boolean>;
  abstract create(
    data: CreateAuthorizationCodeData,
  ): Promise<AuthorizationCode>;
}
