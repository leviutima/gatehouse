import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../../../shared/presentation/http/authenticated-request.js';
import { AdminAuthorizer } from '../../../roles/application/services/admin-authorizer.js';
import {
  ADMIN_ACCESS_KEY,
  AdminAccess,
} from '../decorators/admin-access.decorator.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizer: AdminAuthorizer,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const access = this.reflector.getAllAndOverride<AdminAccess | undefined>(
      ADMIN_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { principal } = request;
    if (!access || !principal) {
      throw new UnauthorizedException();
    }

    const allowed =
      access === 'master'
        ? await this.authorizer.isGlobalAdmin(principal)
        : await this.authorizer.canAdminister(
            principal,
            String(request.params.realm),
          );
    if (!allowed) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'forbidden',
        message:
          access === 'master'
            ? 'Requires an admin of the master realm'
            : 'Requires an admin of this realm or of the master realm',
      });
    }
    return true;
  }
}
