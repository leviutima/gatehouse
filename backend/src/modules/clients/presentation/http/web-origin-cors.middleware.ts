import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MASTER_REALM_NAME } from '../../../realms/domain/entities/realm.entity.js';
import { WebOriginPolicy } from '../../application/services/web-origin-policy.js';

const PROTOCOL_PATH =
  /^\/realms\/([^/]+)\/(?:protocol\/openid-connect\/(?:token|userinfo|certs)|\.well-known\/openid-configuration)$/;
const ADMIN_PATH = /^\/admin(?:\/realms\/([^/]+))?(?:\/|$)/;
const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE';
const ALLOWED_HEADERS = 'Authorization, Content-Type';
const PREFLIGHT_MAX_AGE_SECONDS = '600';

@Injectable()
export class WebOriginCorsMiddleware implements NestMiddleware {
  constructor(private readonly policy: WebOriginPolicy) {}

  async use(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const origin = request.headers.origin;
    const realms = realmsFor(request.originalUrl.split('?')[0]);
    if (!origin || realms.length === 0) {
      return next();
    }

    response.vary('Origin');
    const allowed = await this.isAllowed(realms, origin);
    if (allowed) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Expose-Headers', 'WWW-Authenticate');
    }

    if (request.method !== 'OPTIONS') {
      return next();
    }
    if (allowed) {
      response.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
      response.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
      response.setHeader('Access-Control-Max-Age', PREFLIGHT_MAX_AGE_SECONDS);
    }
    response.status(204).end();
  }

  private async isAllowed(realms: string[], origin: string): Promise<boolean> {
    for (const realm of realms) {
      if (await this.policy.isAllowed(realm, origin)) {
        return true;
      }
    }
    return false;
  }
}

function realmsFor(path: string): string[] {
  const protocol = PROTOCOL_PATH.exec(path);
  if (protocol) {
    return decoded(protocol[1]);
  }
  const admin = ADMIN_PATH.exec(path);
  if (admin) {
    return [MASTER_REALM_NAME, ...(admin[1] ? decoded(admin[1]) : [])];
  }
  return [];
}

function decoded(segment: string): string[] {
  try {
    return [decodeURIComponent(segment)];
  } catch {
    return [];
  }
}
