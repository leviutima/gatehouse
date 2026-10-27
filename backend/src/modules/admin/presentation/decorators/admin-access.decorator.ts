import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_TOKEN_SECURITY } from '../../../../shared/presentation/openapi/setup-swagger.js';
import { errorResponseSchema } from '../../../../shared/presentation/openapi/error-response.schema.js';
import { openApiSchema } from '../../../../shared/presentation/openapi/openapi-schema.js';
import { AdminGuard } from '../guards/admin.guard.js';

export const ADMIN_ACCESS_KEY = 'gatehouse:adminAccess';

export type AdminAccess = 'master' | 'realm';

const adminAccess = (access: AdminAccess) =>
  applyDecorators(
    SetMetadata(ADMIN_ACCESS_KEY, access),
    UseGuards(AdminGuard),
    ApiBearerAuth(ACCESS_TOKEN_SECURITY),
    ApiUnauthorizedResponse({ schema: openApiSchema(errorResponseSchema) }),
    ApiForbiddenResponse({ schema: openApiSchema(errorResponseSchema) }),
  );

export const MasterAdmin = () => adminAccess('master');

export const RealmAdmin = () => adminAccess('realm');
