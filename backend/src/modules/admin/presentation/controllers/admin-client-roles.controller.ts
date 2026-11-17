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

@ApiTags('Admin: Clients')
@RealmAdmin()
@ApiParam({ name: 'realm', example: 'shop' })
@ApiParam({ name: 'clientId', example: 'billing' })
@ApiNotFoundResponse(errorResponse)
@Controller('admin/realms/:realm/clients/:clientId/roles')
export class AdminClientRolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the roles of a client' })
  @ApiOkResponse({ schema: openApiSchema(z.array(roleResponseSchema)) })
  async list(
    @Param('realm') realm: string,
    @Param('clientId') clientId: string,
  ): Promise<RoleResponse[]> {
    const roles = await this.listRoles.execute(realm, clientId);
    return roles.map(toRoleResponse);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a client role',
    description:
      'The name only has to be unique within the client, so it may repeat a realm role or a role of another client.',
  })
  @ApiBody({ schema: openApiSchema(createRoleSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(roleResponseSchema) })
  @ApiConflictResponse(errorResponse)
  @ApiUnprocessableEntityResponse(errorResponse)
  async create(
    @Param('realm') realm: string,
    @Param('clientId') clientId: string,
    @Body(new ZodValidationPipe(createRoleSchema)) body: CreateRoleRequest,
  ): Promise<RoleResponse> {
    return toRoleResponse(
      await this.createRole.execute({ realmName: realm, clientId, ...body }),
    );
  }

  @Delete(':roleName')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a client role and its assignments' })
  @ApiParam({ name: 'roleName', example: 'invoices:read' })
  @ApiNoContentResponse()
  async delete(
    @Param('realm') realm: string,
    @Param('clientId') clientId: string,
    @Param('roleName') roleName: string,
  ): Promise<void> {
    await this.deleteRole.execute({ realmName: realm, clientId, roleName });
  }
}
