import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { z } from 'zod';
import { errorResponseSchema } from '../../../../shared/presentation/openapi/error-response.schema.js';
import { openApiSchema } from '../../../../shared/presentation/openapi/openapi-schema.js';
import { ZodValidationPipe } from '../../../../shared/presentation/pipes/zod-validation.pipe.js';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case.js';
import { DeleteRoleUseCase } from '../../application/use-cases/delete-role.use-case.js';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case.js';
import { RealmAdmin } from '../decorators/admin-access.decorator.js';
import type {
  CreateRoleRequest,
  RoleResponse,
} from '../schemas/role.schemas.js';
import {
  createRoleSchema,
  roleResponseSchema,
  toRoleResponse,
} from '../schemas/role.schemas.js';

const errorResponse = { schema: openApiSchema(errorResponseSchema) };

@ApiTags('Admin: Roles')
@RealmAdmin()
@ApiParam({ name: 'realm', example: 'shop' })
@ApiNotFoundResponse(errorResponse)
@Controller('admin/realms/:realm/roles')
export class AdminRolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the roles of a realm' })
  @ApiOkResponse({ schema: openApiSchema(z.array(roleResponseSchema)) })
  async list(@Param('realm') realm: string): Promise<RoleResponse[]> {
    const roles = await this.listRoles.execute(realm);
    return roles.map(toRoleResponse);
  }

  @Post()
  @ApiOperation({ summary: 'Create a role' })
  @ApiBody({ schema: openApiSchema(createRoleSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(roleResponseSchema) })
  @ApiConflictResponse(errorResponse)
  @ApiUnprocessableEntityResponse(errorResponse)
  async create(
    @Param('realm') realm: string,
    @Body(new ZodValidationPipe(createRoleSchema)) body: CreateRoleRequest,
  ): Promise<RoleResponse> {
    return toRoleResponse(
      await this.createRole.execute({ realmName: realm, ...body }),
    );
  }

  @Delete(':roleName')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a role and its assignments',
    description: 'The reserved admin role cannot be deleted.',
  })
  @ApiParam({ name: 'roleName', example: 'billing:read' })
  @ApiNoContentResponse()
  @ApiUnprocessableEntityResponse(errorResponse)
  async delete(
    @Param('realm') realm: string,
    @Param('roleName') roleName: string,
  ): Promise<void> {
    await this.deleteRole.execute({ realmName: realm, roleName });
  }
}
