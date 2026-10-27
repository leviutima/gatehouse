export const AUTHORIZATION_CODE_LIFESPAN_SECONDS = 60;

export interface AuthorizationCodeProps {
  id: string;
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
  consumedAt: Date | null;
  createdAt: Date;
}

export class AuthorizationCode {
  readonly id: string;
  readonly realmId: string;
  readonly codeHash: string;
  readonly clientId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly redirectUri: string;
  readonly scope: string;
  readonly codeChallenge: string;
  readonly nonce: string | null;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: AuthorizationCodeProps) {
    this.id = props.id;
    this.realmId = props.realmId;
    this.codeHash = props.codeHash;
    this.clientId = props.clientId;
    this.userId = props.userId;
    this.sessionId = props.sessionId;
    this.redirectUri = props.redirectUri;
    this.scope = props.scope;
    this.codeChallenge = props.codeChallenge;
    this.nonce = props.nonce;
    this.expiresAt = props.expiresAt;
    this.consumedAt = props.consumedAt;
    this.createdAt = props.createdAt;
  }
}
