import type { Principal } from '../../../../shared/application/auth/principal.js';
import type { Role } from '../../domain/entities/role.entity.js';
import {
  CreateRoleData,
  RoleAssignment,
  RoleRepository,
} from '../../domain/repositories/role.repository.js';
import { AdminAuthorizer } from './admin-authorizer.js';

class FakeRoleRepository extends RoleRepository {
  readonly members = new Set<string>();

  findByName(): Promise<Role | null> {
    return Promise.resolve(null);
  }

  create(_data: CreateRoleData): Promise<Role> {
    return Promise.reject(new Error('not used'));
  }

  assign(_assignment: RoleAssignment): Promise<void> {
    return Promise.reject(new Error('not used'));
  }

  countMembers(): Promise<number> {
    return Promise.resolve(0);
  }

  countEnabledMembers(realmName: string, roleName: string): Promise<number> {
    return Promise.resolve(
      [...this.members].filter((member) => {
        const [realm, , role] = member.split('/');
        return realm === realmName && role === roleName;
      }).length,
    );
  }

  isUserInRole(
    realmName: string,
    userId: string,
    roleName: string,
  ): Promise<boolean> {
    return Promise.resolve(
      this.members.has(`${realmName}/${userId}/${roleName}`),
    );
  }
}

const principal = (realm: string, subject: string): Principal => ({
  realm,
  subject,
  clientId: 'admin-console',
  scopes: [],
});

describe('AdminAuthorizer', () => {
  const roles = new FakeRoleRepository();
  roles.members.add('master/root/admin');
  roles.members.add('shop/ana/admin');
  const authorizer = new AdminAuthorizer(roles);

  it.each([
    ['a master admin', principal('master', 'root'), 'shop', true],
    ['a master admin on master', principal('master', 'root'), 'master', true],
    ['a realm admin on its realm', principal('shop', 'ana'), 'shop', true],
    [
      'a realm admin on another realm',
      principal('shop', 'ana'),
      'other',
      false,
    ],
    ['a realm admin on master', principal('shop', 'ana'), 'master', false],
    [
      'a master user without the role',
      principal('master', 'bob'),
      'shop',
      false,
    ],
    ['a realm user without the role', principal('shop', 'bob'), 'shop', false],
  ])('decides for %s', async (_case, who, realmName, expected) => {
    await expect(authorizer.canAdminister(who, realmName)).resolves.toBe(
      expected,
    );
  });

  it('treats only master admins as global admins', async () => {
    await expect(
      authorizer.isGlobalAdmin(principal('master', 'root')),
    ).resolves.toBe(true);
    await expect(
      authorizer.isGlobalAdmin(principal('shop', 'ana')),
    ).resolves.toBe(false);
    await expect(
      authorizer.isGlobalAdmin(principal('master', 'bob')),
    ).resolves.toBe(false);
  });

  it('checks the role in the realm of the token, never in the target realm', async () => {
    roles.members.add('shop/root/admin');

    await expect(
      authorizer.canAdminister(principal('other', 'root'), 'shop'),
    ).resolves.toBe(false);
  });
});

describe('AdminAuthorizer.isLastEnabledAdmin', () => {
  it('is true only for the one remaining admin of the realm', async () => {
    const roles = new FakeRoleRepository();
    roles.members.add('shop/ana/admin');
    const authorizer = new AdminAuthorizer(roles);

    await expect(authorizer.isLastEnabledAdmin('shop', 'ana')).resolves.toBe(
      true,
    );
    await expect(authorizer.isLastEnabledAdmin('shop', 'bob')).resolves.toBe(
      false,
    );

    roles.members.add('shop/carla/admin');

    await expect(authorizer.isLastEnabledAdmin('shop', 'ana')).resolves.toBe(
      false,
    );
  });
});
