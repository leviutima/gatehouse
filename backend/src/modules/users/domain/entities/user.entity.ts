export interface UserProps {
  id: string;
  realmId: string;
  username: string;
  email: string;
  emailVerified: boolean;
  passwordHash: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  readonly realmId: string;
  readonly username: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly passwordHash: string;
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.realmId = props.realmId;
    this.username = props.username;
    this.email = props.email;
    this.emailVerified = props.emailVerified;
    this.passwordHash = props.passwordHash;
    this.enabled = props.enabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
