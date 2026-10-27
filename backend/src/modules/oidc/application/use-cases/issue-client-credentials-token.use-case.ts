import { Injectable } from '@nestjs/common';
import {
  ClientAuthenticator,
  ClientCredentials,
} from '../../../clients/application/services/client-authenticator.js';
import { GrantType } from '../../../clients/domain/grant-type.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { OAuthError } from '../errors/oauth.error.js';
import {
  AccessTokenIssuer,
  IssuedAccessToken,
} from '../services/access-token-issuer.js';

export interface ClientCredentialsTokenInput {
  realmName: string;
  credentials: ClientCredentials;
}

@Injectable()
export class IssueClientCredentialsTokenUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly clientAuthenticator: ClientAuthenticator,
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async execute({
    realmName,
    credentials,
  }: ClientCredentialsTokenInput): Promise<IssuedAccessToken> {
    const realm = await this.realms.findByName(realmName);
    if (!realm?.enabled) {
      throw new RealmNotFoundError(realmName);
    }

    const client = await this.clientAuthenticator.authenticate(
      realm.id,
      credentials,
    );
    if (!client) {
      throw OAuthError.invalidClient();
    }
    if (!client.allowsGrant(GrantType.CLIENT_CREDENTIALS)) {
      throw OAuthError.unauthorizedClient('client_credentials');
    }

    return this.accessTokenIssuer.issue({
      realm,
      subject: client.id,
      clientId: client.clientId,
    });
  }
}
