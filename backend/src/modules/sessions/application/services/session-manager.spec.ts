import { FakeSecretHasher } from '../../../../shared/testing/fake-secret-hasher.js';
import { SequentialSecretGenerator } from '../../../../shared/testing/sequential-secret-generator.js';
import {
  ManualClock,
  TEST_NOW,
} from '../../../../shared/testing/test-clock.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import { InMemoryUserRepository } from '../../../users/testing/in-memory-user.repository.js';
import { InMemorySessionRepository } from '../../testing/in-memory-session.repository.js';
import { SessionManager } from './session-manager.js';

describe('SessionManager', () => {
  const shop = aRealm({
    name: 'shop',
    sessionIdleTimeout: 1800,
    sessionMaxLifespan: 7200,
  });
  const other = aRealm({ name: 'other' });

  let sessions: InMemorySessionRepository;
  let users: InMemoryUserRepository;
  let clock: ManualClock;
  let manager: SessionManager;
  let ana: User;

  beforeEach(async () => {
    sessions = new InMemorySessionRepository();
    users = new InMemoryUserRepository();
    clock = new ManualClock();
    manager = new SessionManager(
      sessions,
      users,
      new SequentialSecretGenerator('token'),
      new FakeSecretHasher(),
      clock,
    );
    ana = await users.create({
      realmId: shop.id,
      username: 'ana',
      email: 'ana@shop.example',
      emailVerified: false,
      passwordHash: 'hash',
    });
  });

  it('starts a session that stores only the hash of its token', async () => {
    const { session, token } = await manager.start(shop, ana);

    expect(token).toBe('token-1');
    expect(session).toMatchObject({
      realmId: shop.id,
      userId: ana.id,
      tokenHash: 'hashed:token-1',
      authTime: TEST_NOW,
      lastSeenAt: TEST_NOW,
      expiresAt: new Date(TEST_NOW.getTime() + 7200 * 1000),
    });
  });

  it('resumes the session from its token and marks it as seen', async () => {
    const { session, token } = await manager.start(shop, ana);
    clock.advance(600);

    const resumed = await manager.resume(shop, token);

    expect(resumed?.session.id).toBe(session.id);
    expect(resumed?.user.id).toBe(ana.id);
    expect(sessions.sessions[0].lastSeenAt).toEqual(clock.now());
  });

  it.each([
    ['no token', undefined],
    ['an unknown token', 'forged'],
  ])('resumes nothing for %s', async (_case, token) => {
    await manager.start(shop, ana);

    await expect(manager.resume(shop, token)).resolves.toBeNull();
  });

  it('does not resume a session in another realm', async () => {
    const { token } = await manager.start(shop, ana);

    await expect(manager.resume(other, token)).resolves.toBeNull();
  });

  it('keeps an active session alive past the idle timeout of its start', async () => {
    const { token } = await manager.start(shop, ana);
    clock.advance(1500);
    await manager.resume(shop, token);
    clock.advance(1500);

    await expect(manager.resume(shop, token)).resolves.not.toBeNull();
  });

  it('drops a session left idle too long', async () => {
    const { token } = await manager.start(shop, ana);
    clock.advance(1800);

    await expect(manager.resume(shop, token)).resolves.toBeNull();
    expect(sessions.sessions).toHaveLength(0);
  });

  it('drops a session at its max lifespan even if it keeps being used', async () => {
    const { token } = await manager.start(shop, ana);
    for (let step = 0; step < 4; step++) {
      clock.advance(1500);
      await manager.resume(shop, token);
    }
    clock.advance(1200);

    await expect(manager.resume(shop, token)).resolves.toBeNull();
  });

  it('does not resume the session of a disabled user', async () => {
    const { token } = await manager.start(shop, ana);
    await users.update(ana.id, { enabled: false });

    await expect(manager.resume(shop, token)).resolves.toBeNull();
  });

  it('resumes a session by id under the same rules', async () => {
    const { session } = await manager.start(shop, ana);
    clock.advance(600);

    await expect(manager.resumeById(shop, session.id)).resolves.toMatchObject({
      user: { id: ana.id },
    });
    await expect(manager.resumeById(other, session.id)).resolves.toBeNull();

    clock.advance(1800);
    await expect(manager.resumeById(shop, session.id)).resolves.toBeNull();
  });
});
