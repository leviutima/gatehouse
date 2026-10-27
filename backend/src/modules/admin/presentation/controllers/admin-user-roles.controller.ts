import { Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { errorResponseSchema } from '../../../../shared/presentation/openapi/error-response.schema.js';
import { openApiSchema } from '../../../../shared/presentation/openapi/openapi-schema.js';
import { ZodValidationPipe } from '../../../../shared/presentation/pipes/zod-validation.pipe.js';
import { AssignUserRoleUseCase } from '../../application/use-cases/assign-user-role.use-case.js';
import { ListUserRolesUseCase } from '../../application/use-cases/list-user-roles.use-case.js';
import { UnassignUserRoleUseCase } from '../../application/use-cases/unassign-user-role.use-case.js';
import { RealmAdmin } from '../decorators/admin-access.decorator.js';
import type { RoleResponse } from '../schemas/role.schemas.js';
import { roleResponseSchema, toRoleResponse } from '../schemas/role.schemas.js';
import { userIdSchema } from '../schemas/user.schemas.js';

const errorResponse = { schema: openApiSchema(errorResponseSchema) };

@ApiTags('Admin: Users')
@RealmAdmin()
@ApiParam({ name: 'realm', example: 'shop' })
@ApiNotFoundResponse(errorResponse)
@Controller('admin/realms/:realm/users/:userId/roles')
export class AdminUserRolesController {
  constructor(
    private readonly listUserRoles: ListUserRolesUseCase,
    private readonly assignUserRole: AssignUserRoleUseCase,
    private readonly unassignUserRole: UnassignUserRoleUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the roles of a user' })
  @ApiOkResponse({ schema: openApiSchema(z.array(roleResponseSchema)) })
  async list(
    @Param('realm') realm: string,
    @Param('userId', new ZodValidationPipe(userIdSchema)) userId: string,
  ): Promise<RoleResponse[]> {
    const roles = await this.listUserRoles.execute({
      realmName: realm,
      userId,
    });
    return roles.map(toRoleResponse);
  }

  @Put(':roleName')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Give a role to a user',
    description: 'Idempotent.',
  })
  @ApiParam({ name: 'roleName', example: 'billing:read' })
  @ApiNoContentResponse()
  async assign(
    @Param('realm') realm: string,
    @Param('userId', new ZodValidationPipe(userIdSchema)) userId: string,
    @Param('roleName') roleName: string,
  ): Promise<void> {
    await this.assignUserRole.execute({ realmName: realm, userId, roleName });
  }

  @Delete(':roleName')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Take a role away from a user',
    description:
      'The admin role cannot be taken from the last enabled admin of the realm.',
  })
  @ApiParam({ name: 'roleName', example: 'billing:read' })
  @ApiNoContentResponse()
  @ApiConflictResponse(errorResponse)
  async unassign(
    @Param('realm') realm: string,
    @Param('userId', new ZodValidationPipe(userIdSchema)) userId: string,
    @Param('roleName') roleName: string,
  ): Promise<void> {
    await this.unassignUserRole.execute({ realmName: realm, userId, roleName });
  }
}
