export const ADMIN_ROLE_NAME = 'admin';

export interface RoleProps {
  id: string;
  realmId: string;
  clientId: string | null;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Role {
  readonly id: string;
  readonly realmId: string;
  readonly clientId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: RoleProps) {
    this.id = props.id;
    this.realmId = props.realmId;
    this.clientId = props.clientId;
    this.name = props.name;
    this.description = props.description;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get isRealmRole(): boolean {
    return this.clientId === null;
  }

  get isAdmin(): boolean {
    return this.isRealmRole && this.name === ADMIN_ROLE_NAME;
  }
}
