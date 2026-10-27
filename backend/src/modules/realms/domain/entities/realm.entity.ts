import { LoginIdentifier } from '../login-identifier.js';
import { PasswordPolicy } from '../password-policy.js';

export const MASTER_REALM_NAME = 'master';

export interface RealmProps {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  loginIdentifier: LoginIdentifier;
  passwordMinLength: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Realm {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly loginIdentifier: LoginIdentifier;
  readonly passwordMinLength: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: RealmProps) {
    this.id = props.id;
    this.name = props.name;
    this.displayName = props.displayName;
    this.enabled = props.enabled;
    this.loginIdentifier = props.loginIdentifier;
    this.passwordMinLength = props.passwordMinLength;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get isMaster(): boolean {
    return this.name === MASTER_REALM_NAME;
  }

  get usesEmailAsUsername(): boolean {
    return this.loginIdentifier === LoginIdentifier.EMAIL;
  }

  get passwordPolicy(): PasswordPolicy {
    return new PasswordPolicy(this.passwordMinLength);
  }
}
