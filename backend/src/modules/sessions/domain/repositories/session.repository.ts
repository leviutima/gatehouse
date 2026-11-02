import type { Session } from '../entities/session.entity.js';

export interface CreateSessionData {
  realmId: string;
  userId: string;
  tokenHash: string;
  authTime: Date;
  lastSeenAt: Date;
  expiresAt: Date;
}

export abstract class SessionRepository {
  abstract findById(id: string): Promise<Session | null>;
  abstract findByTokenHash(tokenHash: string): Promise<Session | null>;
  abstract create(data: CreateSessionData): Promise<Session>;
  abstract touch(id: string, lastSeenAt: Date): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
