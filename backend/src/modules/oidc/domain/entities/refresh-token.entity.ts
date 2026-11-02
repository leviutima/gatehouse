export interface RefreshTokenProps {
  id: string;
  realmId: string;
  tokenHash: string;
  familyId: string;
  clientId: string;
  userId: string;
  sessionId: string;
  scope: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class RefreshToken {
  readonly id: string;
  readonly realmId: string;
  readonly tokenHash: string;
  readonly familyId: string;
  readonly clientId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly scope: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: RefreshTokenProps) {
    this.id = props.id;
    this.realmId = props.realmId;
    this.tokenHash = props.tokenHash;
    this.familyId = props.familyId;
    this.clientId = props.clientId;
    this.userId = props.userId;
    this.sessionId = props.sessionId;
    this.scope = props.scope;
    this.expiresAt = props.expiresAt;
    this.usedAt = props.usedAt;
    this.createdAt = props.createdAt;
  }

  get isUsed(): boolean {
    return this.usedAt !== null;
  }

  isExpiredAt(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }
}
