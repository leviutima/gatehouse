import { Injectable } from '@nestjs/common';
import type { Principal } from '../../../../shared/application/auth/principal.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { UserRepository } from '../../../users/domain/repositories/user.repository.js';
import { OPENID_SCOPE } from '../../domain/scope.js';
import { BearerTokenError } from '../errors/bearer-token.error.js';

export type UserInfo = Record<string, string | boolean>;

export interface GetUserInfoInput {
  realmName: string;
  principal: Principal;
}

@Injectable()
export class GetUserInfoUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly users: UserRepository,
  ) {}

  async execute({ realmName, principal }: GetUserInfoInput): Promise<UserInfo> {
    if (principal.realm !== realmName) {
      throw BearerTokenError.invalidToken();
    }
    if (!principal.scopes.includes(OPENID_SCOPE)) {
      throw BearerTokenError.insufficientScope(OPENID_SCOPE);
    }

    const realm = await this.realms.findByName(realmName);
    const user = realm
      ? await this.users.findById(realm.id, principal.subject)
      : null;
    if (!user?.enabled) {
      throw BearerTokenError.invalidToken();
    }

    return {
      sub: user.id,
      ...(principal.scopes.includes('profile')
        ? { preferred_username: user.username }
        : {}),
      ...(principal.scopes.includes('email')
        ? { email: user.email, email_verified: user.emailVerified }
        : {}),
    };
  }
}
