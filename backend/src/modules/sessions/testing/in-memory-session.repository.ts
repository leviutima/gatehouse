import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { Session } from '../domain/entities/session.entity.js';
import {
  CreateSessionData,
  SessionRepository,
} from '../domain/repositories/session.repository.js';

export class InMemorySessionRepository extends SessionRepository {
  readonly sessions: Session[] = [];

  findByTokenHash(tokenHash: string): Promise<Session | null> {
    return Promise.resolve(
      this.sessions.find((session) => session.tokenHash === tokenHash) ?? null,
    );
  }

  create(data: CreateSessionData): Promise<Session> {
    const session = new Session({
      id: `session-${this.sessions.length + 1}`,
      createdAt: TEST_NOW,
      ...data,
    });
    this.sessions.push(session);
    return Promise.resolve(session);
  }

  touch(id: string, lastSeenAt: Date): Promise<void> {
    const index = this.sessions.findIndex((session) => session.id === id);
    const current = this.sessions[index];
    this.sessions[index] = new Session({
      id: current.id,
      realmId: current.realmId,
      userId: current.userId,
      tokenHash: current.tokenHash,
      authTime: current.authTime,
      lastSeenAt,
      expiresAt: current.expiresAt,
      createdAt: current.createdAt,
    });
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    const index = this.sessions.findIndex((session) => session.id === id);
    if (index >= 0) {
      this.sessions.splice(index, 1);
    }
    return Promise.resolve();
  }
}
