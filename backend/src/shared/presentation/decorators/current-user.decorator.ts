import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Principal } from '../../application/auth/principal.js';
import type { AuthenticatedRequest } from '../http/authenticated-request.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal => {
    const { principal } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    if (!principal) {
      throw new UnauthorizedException();
    }
    return principal;
  },
);
