import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { AuthorizationCode } from '../domain/entities/authorization-code.entity.js';
import {
  AuthorizationCodeRepository,
  CreateAuthorizationCodeData,
} from '../domain/repositories/authorization-code.repository.js';

export class InMemoryAuthorizationCodeRepository extends AuthorizationCodeRepository {
  readonly codes: AuthorizationCode[] = [];

  findByCodeHash(codeHash: string): Promise<AuthorizationCode | null> {
    return Promise.resolve(
      this.codes.find((code) => code.codeHash === codeHash) ?? null,
    );
  }

  markConsumed(id: string, consumedAt: Date): Promise<boolean> {
    const index = this.codes.findIndex((code) => code.id === id);
    const current = this.codes[index];
    if (!current || current.isConsumed) {
      return Promise.resolve(false);
    }
    this.codes[index] = new AuthorizationCode({
      id: current.id,
      realmId: current.realmId,
      codeHash: current.codeHash,
      clientId: current.clientId,
      userId: current.userId,
      sessionId: current.sessionId,
      redirectUri: current.redirectUri,
      scope: current.scope,
      codeChallenge: current.codeChallenge,
      nonce: current.nonce,
      expiresAt: current.expiresAt,
      consumedAt,
      createdAt: current.createdAt,
    });
    return Promise.resolve(true);
  }

  create(data: CreateAuthorizationCodeData): Promise<AuthorizationCode> {
    const code = new AuthorizationCode({
      id: `code-${this.codes.length + 1}`,
      consumedAt: null,
      createdAt: TEST_NOW,
      ...data,
    });
    this.codes.push(code);
    return Promise.resolve(code);
  }
}
