import { timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Env } from '../../../../shared/infrastructure/config/env.schema.js';

const SESSION_COOKIE = 'GATEHOUSE_SESSION';
const CSRF_COOKIE = 'GATEHOUSE_LOGIN_CSRF';

@Injectable()
export class LoginCookies {
  private readonly secure: boolean;

  constructor(config: ConfigService<Env, true>) {
    this.secure = config
      .get('GATEHOUSE_ISSUER', { infer: true })
      .startsWith('https://');
  }

  sessionToken(request: Request): string | undefined {
    return readCookie(request, SESSION_COOKIE);
  }

  setSession(
    response: Response,
    realmName: string,
    token: string,
    maxAgeSeconds: number,
  ): void {
    response.cookie(SESSION_COOKIE, token, {
      path: realmPath(realmName),
      maxAge: maxAgeSeconds * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secure,
    });
  }

  csrfToken(request: Request): string | undefined {
    return readCookie(request, CSRF_COOKIE);
  }

  setCsrf(response: Response, realmName: string, token: string): void {
    response.cookie(CSRF_COOKIE, token, {
      path: `${realmPath(realmName)}/protocol/openid-connect/auth`,
      httpOnly: true,
      sameSite: 'strict',
      secure: this.secure,
    });
  }

  isCsrfValid(request: Request, submitted: unknown): boolean {
    const expected = this.csrfToken(request);
    if (!expected || typeof submitted !== 'string') {
      return false;
    }
    const a = Buffer.from(expected);
    const b = Buffer.from(submitted);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}

function realmPath(realmName: string): string {
  return `/realms/${encodeURIComponent(realmName)}`;
}

function readCookie(request: Request, name: string): string | undefined {
  for (const part of request.headers.cookie?.split(';') ?? []) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
