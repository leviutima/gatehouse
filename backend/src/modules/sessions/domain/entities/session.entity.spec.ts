import { Session } from './session.entity.js';

const start = new Date('2026-10-28T10:00:00Z');
const minutes = (count: number) => new Date(start.getTime() + count * 60_000);

const session = (lastSeenAt: Date) =>
  new Session({
    id: 'session-1',
    realmId: 'shop-id',
    userId: 'user-1',
    tokenHash: 'hash',
    authTime: start,
    lastSeenAt,
    expiresAt: minutes(60),
    createdAt: start,
  });

describe('Session', () => {
  const idleTimeout = 30 * 60;

  it('is active while used within the idle timeout and before it expires', () => {
    expect(session(start).isActiveAt(minutes(29), idleTimeout)).toBe(true);
  });

  it('goes idle when unused for the idle timeout', () => {
    expect(session(start).isActiveAt(minutes(30), idleTimeout)).toBe(false);
  });

  it('expires at its max lifespan even if it keeps being used', () => {
    expect(session(minutes(59)).isActiveAt(minutes(60), idleTimeout)).toBe(
      false,
    );
  });
});
