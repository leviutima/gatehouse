import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { TokenVerifier } from '../../application/auth/token-verifier.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { AuthenticatedRequest } from '../http/authenticated-request.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenVerifier: TokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      response.setHeader('WWW-Authenticate', 'Bearer');
      throw unauthorized('Missing bearer token');
    }

    const principal = await this.tokenVerifier.verify(token);
    if (!principal) {
      response.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"');
      throw unauthorized('Invalid or expired token');
    }

    request.principal = principal;
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  const [scheme, token, ...rest] = header?.split(' ') ?? [];
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    return null;
  }
  return token;
}

function unauthorized(message: string): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    error: 'unauthorized',
    message,
  });
}
