export interface SessionProps {
  id: string;
  realmId: string;
  userId: string;
  tokenHash: string;
  authTime: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

export class Session {
  readonly id: string;
  readonly realmId: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly authTime: Date;
  readonly lastSeenAt: Date;
  readonly expiresAt: Date;
  readonly createdAt: Date;

  constructor(props: SessionProps) {
    this.id = props.id;
    this.realmId = props.realmId;
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.authTime = props.authTime;
    this.lastSeenAt = props.lastSeenAt;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
  }

  isActiveAt(now: Date, idleTimeoutSeconds: number): boolean {
    const idleDeadline = this.lastSeenAt.getTime() + idleTimeoutSeconds * 1000;
    return (
      now.getTime() < this.expiresAt.getTime() && now.getTime() < idleDeadline
    );
  }
}
