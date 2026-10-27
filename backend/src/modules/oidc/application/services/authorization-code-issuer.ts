import { Injectable } from '@nestjs/common';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import { Clock } from '../../../../shared/application/time/clock.js';
import { AUTHORIZATION_CODE_LIFESPAN_SECONDS } from '../../domain/entities/authorization-code.entity.js';
import { AuthorizationCodeRepository } from '../../domain/repositories/authorization-code.repository.js';

export interface AuthorizationGrant {
  realmId: string;
  clientId: string;
  userId: string;
  sessionId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  nonce: string | null;
}

@Injectable()
export class AuthorizationCodeIssuer {
  constructor(
    private readonly codes: AuthorizationCodeRepository,
    private readonly secretGenerator: SecretGenerator,
    private readonly secretHasher: SecretHasher,
    private readonly clock: Clock,
  ) {}

  async issue(grant: AuthorizationGrant): Promise<string> {
    const code = this.secretGenerator.generate();
    const expiresAt = new Date(
      this.clock.now().getTime() + AUTHORIZATION_CODE_LIFESPAN_SECONDS * 1000,
    );
    await this.codes.create({
      ...grant,
      codeHash: this.secretHasher.hash(code),
      expiresAt,
    });
    return code;
  }
}
