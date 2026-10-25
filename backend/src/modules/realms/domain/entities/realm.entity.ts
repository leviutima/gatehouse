import { UsernameRequiredError } from '../errors/username-required.error.js';
import { WeakPasswordError } from '../errors/weak-password.error.js';
import { LoginIdentifier } from '../login-identifier.js';

export const MASTER_REALM_NAME = 'master';
export const PASSWORD_MAX_LENGTH = 256;

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

  resolveUsername(input: { username?: string; email: string }): string {
    if (this.usesEmailAsUsername) {
      return input.email;
    }
    if (!input.username) {
      throw new UsernameRequiredError();
    }
    return input.username;
  }

  assertPasswordAllowed(password: string): void {
    const length = [...password].length;
    if (length < this.passwordMinLength || length > PASSWORD_MAX_LENGTH) {
      throw new WeakPasswordError(this.passwordMinLength, PASSWORD_MAX_LENGTH);
    }
  }
}
