import { Injectable } from '@nestjs/common';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import { Clock } from '../../../../shared/application/time/clock.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import { UserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { Session } from '../../domain/entities/session.entity.js';
import { SessionRepository } from '../../domain/repositories/session.repository.js';

export interface StartedSession {
  session: Session;
  token: string;
}

export interface ResumedSession {
  session: Session;
  user: User;
}

@Injectable()
export class SessionManager {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly secretGenerator: SecretGenerator,
    private readonly secretHasher: SecretHasher,
    private readonly clock: Clock,
  ) {}

  async start(realm: Realm, user: User): Promise<StartedSession> {
    const token = this.secretGenerator.generate();
    const now = this.clock.now();
    const session = await this.sessions.create({
      realmId: realm.id,
      userId: user.id,
      tokenHash: this.secretHasher.hash(token),
      authTime: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + realm.sessionMaxLifespan * 1000),
    });
    return { session, token };
  }

  find(sessionId: string): Promise<Session | null> {
    return this.sessions.findById(sessionId);
  }

  end(sessionId: string): Promise<void> {
    return this.sessions.delete(sessionId);
  }

  async resume(
    realm: Realm,
    token: string | undefined,
  ): Promise<ResumedSession | null> {
    if (!token) {
      return null;
    }
    const session = await this.sessions.findByTokenHash(
      this.secretHasher.hash(token),
    );
    if (!session || session.realmId !== realm.id) {
      return null;
    }

    const now = this.clock.now();
    if (!session.isActiveAt(now, realm.sessionIdleTimeout)) {
      await this.sessions.delete(session.id);
      return null;
    }
    const user = await this.users.findById(realm.id, session.userId);
    if (!user?.enabled) {
      return null;
    }

    await this.sessions.touch(session.id, now);
    return { session, user };
  }
}
