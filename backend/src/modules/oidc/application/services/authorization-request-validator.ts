import { Injectable } from '@nestjs/common';
import type { Client } from '../../../clients/domain/entities/client.entity.js';
import { GrantType } from '../../../clients/domain/grant-type.js';
import { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { parseScope } from '../../domain/scope.js';

const CODE_CHALLENGE_METHOD = 'S256';
const S256_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_STATE_LENGTH = 512;
const MAX_NONCE_LENGTH = 255;

export type AuthorizationErrorCode =
  | 'invalid_request'
  | 'unauthorized_client'
  | 'unsupported_response_type'
  | 'invalid_scope';

export interface ValidAuthorizationRequest {
  realm: Realm;
  client: Client;
  redirectUri: string;
  scope: string;
  state: string | null;
  codeChallenge: string;
  nonce: string | null;
}

export type AuthorizationRequestOutcome =
  | { kind: 'rejected'; reason: string }
  | {
      kind: 'redirect_error';
      redirectUri: string;
      state: string | null;
      error: AuthorizationErrorCode;
      description: string;
    }
  | { kind: 'valid'; request: ValidAuthorizationRequest };

export type AuthorizationParams = Record<string, unknown>;

@Injectable()
export class AuthorizationRequestValidator {
  constructor(
    private readonly realms: RealmRepository,
    private readonly clients: ClientRepository,
  ) {}

  async validate(
    realmName: string,
    params: AuthorizationParams,
  ): Promise<AuthorizationRequestOutcome> {
    const realm = await this.realms.findByName(realmName);
    if (!realm?.enabled) {
      return rejected('This realm does not exist.');
    }

    const clientId = single(params.client_id);
    const client = clientId
      ? await this.clients.findByClientId(realm.id, clientId)
      : null;
    if (!client?.enabled) {
      return rejected('This application is not registered with this realm.');
    }

    const redirectUri = single(params.redirect_uri);
    if (!redirectUri || !client.isRedirectUriAllowed(redirectUri)) {
      return rejected(
        'The address this application asked to return to is not registered.',
      );
    }

    const state = single(params.state) ?? null;
    const fail = (
      error: AuthorizationErrorCode,
      description: string,
    ): AuthorizationRequestOutcome => ({
      kind: 'redirect_error',
      redirectUri,
      state,
      error,
      description,
    });

    const repeated = Object.entries(params).find(([, value]) =>
      Array.isArray(value),
    );
    if (repeated) {
      return fail('invalid_request', `Repeated parameter "${repeated[0]}"`);
    }
    if (params.response_type !== 'code') {
      return params.response_type === undefined
        ? fail('invalid_request', 'response_type is required')
        : fail(
            'unsupported_response_type',
            'Only response_type=code is supported',
          );
    }
    if (!client.allowsGrant(GrantType.AUTHORIZATION_CODE)) {
      return fail(
        'unauthorized_client',
        'The client is not allowed to use the authorization_code grant',
      );
    }

    const codeChallenge = single(params.code_challenge);
    if (!codeChallenge) {
      return fail('invalid_request', 'PKCE code_challenge is required');
    }
    if (params.code_challenge_method !== CODE_CHALLENGE_METHOD) {
      return fail('invalid_request', 'code_challenge_method must be S256');
    }
    if (!S256_CHALLENGE_PATTERN.test(codeChallenge)) {
      return fail(
        'invalid_request',
        'code_challenge is not a valid S256 challenge',
      );
    }

    const scope = parseScope(single(params.scope));
    if (!scope) {
      return fail('invalid_scope', 'The requested scope is not supported');
    }

    const nonce = single(params.nonce) ?? null;
    if ((state?.length ?? 0) > MAX_STATE_LENGTH) {
      return fail('invalid_request', 'state is too long');
    }
    if ((nonce?.length ?? 0) > MAX_NONCE_LENGTH) {
      return fail('invalid_request', 'nonce is too long');
    }

    return {
      kind: 'valid',
      request: {
        realm,
        client,
        redirectUri,
        scope: scope.join(' '),
        state,
        codeChallenge,
        nonce,
      },
    };
  }
}

function single(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function rejected(reason: string): AuthorizationRequestOutcome {
  return { kind: 'rejected', reason };
}
