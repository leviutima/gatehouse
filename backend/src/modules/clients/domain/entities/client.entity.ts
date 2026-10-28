import { ClientType } from '../client-type.js';
import { InvalidClientConfigurationError } from '../errors/invalid-client-configuration.error.js';
import { GrantType } from '../grant-type.js';
import { assertValidRedirectUri } from '../redirect-uri.js';

export interface ClientProps {
  id: string;
  realmId: string;
  clientId: string;
  name: string;
  type: ClientType;
  secretHash: string | null;
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
  grantTypes: GrantType[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ClientConfiguration = Pick<
  ClientProps,
  | 'type'
  | 'secretHash'
  | 'redirectUris'
  | 'postLogoutRedirectUris'
  | 'grantTypes'
>;

export class Client {
  readonly id: string;
  readonly realmId: string;
  readonly clientId: string;
  readonly name: string;
  readonly type: ClientType;
  readonly secretHash: string | null;
  readonly redirectUris: readonly string[];
  readonly postLogoutRedirectUris: readonly string[];
  readonly grantTypes: readonly GrantType[];
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ClientProps) {
    Client.assertValid(props);
    this.id = props.id;
    this.realmId = props.realmId;
    this.clientId = props.clientId;
    this.name = props.name;
    this.type = props.type;
    this.secretHash = props.secretHash;
    this.redirectUris = [...props.redirectUris];
    this.postLogoutRedirectUris = [...(props.postLogoutRedirectUris ?? [])];
    this.grantTypes = [...props.grantTypes];
    this.enabled = props.enabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get isConfidential(): boolean {
    return this.type === ClientType.CONFIDENTIAL;
  }

  allowsGrant(grant: GrantType): boolean {
    return this.grantTypes.includes(grant);
  }

  isRedirectUriAllowed(uri: string): boolean {
    return this.redirectUris.includes(uri);
  }

  isPostLogoutRedirectUriAllowed(uri: string): boolean {
    return this.postLogoutRedirectUris.includes(uri);
  }

  static assertValid(props: ClientConfiguration): void {
    const grants = new Set(props.grantTypes);

    if (grants.size === 0) {
      throw new InvalidClientConfigurationError(
        'Client must allow at least one grant type',
      );
    }
    if (props.type === ClientType.PUBLIC) {
      if (props.secretHash !== null) {
        throw new InvalidClientConfigurationError(
          'Public client must not have a secret',
        );
      }
      if (grants.has(GrantType.CLIENT_CREDENTIALS)) {
        throw new InvalidClientConfigurationError(
          'Public client cannot use the client_credentials grant',
        );
      }
    }
    if (props.type === ClientType.CONFIDENTIAL && props.secretHash === null) {
      throw new InvalidClientConfigurationError(
        'Confidential client must have a secret',
      );
    }
    if (
      grants.has(GrantType.REFRESH_TOKEN) &&
      !grants.has(GrantType.AUTHORIZATION_CODE)
    ) {
      throw new InvalidClientConfigurationError(
        'The refresh_token grant requires the authorization_code grant',
      );
    }
    if (
      grants.has(GrantType.AUTHORIZATION_CODE) &&
      props.redirectUris.length === 0
    ) {
      throw new InvalidClientConfigurationError(
        'The authorization_code grant requires at least one redirect URI',
      );
    }
    for (const uri of [
      ...props.redirectUris,
      ...(props.postLogoutRedirectUris ?? []),
    ]) {
      assertValidRedirectUri(uri);
    }
  }
}
