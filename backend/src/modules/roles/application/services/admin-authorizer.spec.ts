import type { Principal } from '../../../../shared/application/auth/principal.js';
import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { InMemoryUserRepository } from '../../../users/testing/in-memory-user.repository.js';
import { InMemoryRoleRepository } from '../../testing/in-memory-role.repository.js';
import { AdminAuthorizer } from './admin-authorizer.js';
import { AdminRoleProvisioner } from './admin-role-provisioner.js';

const principal = (realm: string, subject: string): Principal => ({
  realm,
  subject,
  clientId: 'admin-console',
  scopes: [],
});

describe('AdminAuthorizer', () => {
  let users: InMemoryUserRepository;
  let provisioner: AdminRoleProvisioner;
  let authorizer: AdminAuthorizer;

  async function addUser(realmName: string, username: string, admin = false) {
    const user = await users.create({
      realmId: `${realmName}-id`,
      username,
      email: `${username}@${realmName}.example`,
      emailVerified: false,
      passwordHash: 'hash',
    });
    if (admin) {
      await provisioner.grantAdmin(`${realmName}-id`, user.id);
    }
    return user.id;
  }

  let root: string;
  let bob: string;
  let ana: string;
  let carla: string;

  beforeEach(async () => {
    const realms = new InMemoryRealmRepository([
      aRealm({ name: 'master' }),
      aRealm({ name: 'shop' }),
      aRealm({ name: 'other' }),
    ]);
    users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository(realms, users);
    provisioner = new AdminRoleProvisioner(roles);
    authorizer = new AdminAuthorizer(roles);

    root = await addUser('master', 'root', true);
    bob = await addUser('master', 'bob');
    ana = await addUser('shop', 'ana', true);
    carla = await addUser('shop', 'carla');
  });

  it.each([
    [
      'a master admin on another realm',
      () => principal('master', root),
      'shop',
      true,
    ],
    [
      'a master admin on master',
      () => principal('master', root),
      'master',
      true,
    ],
    ['a realm admin on its realm', () => principal('shop', ana), 'shop', true],
    [
      'a realm admin on another realm',
      () => principal('shop', ana),
      'other',
      false,
    ],
    ['a realm admin on master', () => principal('shop', ana), 'master', false],
    [
      'a master user without the role',
      () => principal('master', bob),
      'shop',
      false,
    ],
    [
      'a realm user without the role',
      () => principal('shop', carla),
      'shop',
      false,
    ],
  ])('decides for %s', async (_case, who, realmName, expected) => {
    await expect(authorizer.canAdminister(who(), realmName)).resolves.toBe(
      expected,
    );
  });

  it('treats only master admins as global admins', async () => {
    await expect(
      authorizer.isGlobalAdmin(principal('master', root)),
    ).resolves.toBe(true);
    await expect(
      authorizer.isGlobalAdmin(principal('shop', ana)),
    ).resolves.toBe(false);
    await expect(
      authorizer.isGlobalAdmin(principal('master', bob)),
    ).resolves.toBe(false);
  });

  it('checks the role in the realm of the token, never in the target realm', async () => {
    await provisioner.grantAdmin('shop-id', root);

    await expect(
      authorizer.canAdminister(principal('other', root), 'shop'),
    ).resolves.toBe(false);
  });

  it('stops treating a disabled user as an admin', async () => {
    await users.update(ana, { enabled: false });

    await expect(
      authorizer.canAdminister(principal('shop', ana), 'shop'),
    ).resolves.toBe(false);
  });

  it('tells the last enabled admin of a realm apart', async () => {
    await expect(authorizer.isLastEnabledAdmin('shop', ana)).resolves.toBe(
      true,
    );
    await expect(authorizer.isLastEnabledAdmin('shop', carla)).resolves.toBe(
      false,
    );

    await provisioner.grantAdmin('shop-id', carla);

    await expect(authorizer.isLastEnabledAdmin('shop', ana)).resolves.toBe(
      false,
    );

    await users.update(carla, { enabled: false });

    await expect(authorizer.isLastEnabledAdmin('shop', ana)).resolves.toBe(
      true,
    );
  });
});
