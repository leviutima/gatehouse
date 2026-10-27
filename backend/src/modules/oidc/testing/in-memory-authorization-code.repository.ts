import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { AuthorizationCode } from '../domain/entities/authorization-code.entity.js';
import {
  AuthorizationCodeRepository,
  CreateAuthorizationCodeData,
} from '../domain/repositories/authorization-code.repository.js';

export class InMemoryAuthorizationCodeRepository extends AuthorizationCodeRepository {
  readonly codes: AuthorizationCode[] = [];

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
