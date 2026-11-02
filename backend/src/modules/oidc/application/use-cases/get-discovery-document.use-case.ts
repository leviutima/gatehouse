import { Injectable } from '@nestjs/common';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { SUPPORTED_SCOPES } from '../../domain/scope.js';
import { RealmIssuer } from '../realm-issuer.js';

export interface DiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint: string;
  response_types_supported: string[];
  response_modes_supported: string[];
  grant_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  code_challenge_methods_supported: string[];
  scopes_supported: string[];
  claims_supported: string[];
  authorization_response_iss_parameter_supported: boolean;
}

@Injectable()
export class GetDiscoveryDocumentUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly realmIssuer: RealmIssuer,
  ) {}

  async execute(realmName: string): Promise<DiscoveryDocument> {
    const realm = await this.realms.findByName(realmName);
    if (!realm?.enabled) {
      throw new RealmNotFoundError(realmName);
    }

    const issuer = this.realmIssuer.forRealm(realm.name);
    const endpoint = (name: string) =>
      `${issuer}/protocol/openid-connect/${name}`;
    return {
      issuer,
      authorization_endpoint: endpoint('auth'),
      token_endpoint: endpoint('token'),
      userinfo_endpoint: endpoint('userinfo'),
      jwks_uri: endpoint('certs'),
      end_session_endpoint: endpoint('logout'),
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: [
        'authorization_code',
        'refresh_token',
        'client_credentials',
      ],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['ES256'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'none',
      ],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: [...SUPPORTED_SCOPES],
      claims_supported: [
        'iss',
        'sub',
        'aud',
        'azp',
        'exp',
        'iat',
        'auth_time',
        'nonce',
        'sid',
        'preferred_username',
        'email',
        'email_verified',
      ],
      authorization_response_iss_parameter_supported: true,
    };
  }
}
