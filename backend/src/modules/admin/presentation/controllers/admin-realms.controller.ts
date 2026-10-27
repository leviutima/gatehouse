import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { GetRealmUseCase } from '../../../realms/application/use-cases/get-realm.use-case.js';
import { ListRealmsUseCase } from '../../../realms/application/use-cases/list-realms.use-case.js';
import { CreateRealmUseCase } from '../../application/use-cases/create-realm.use-case.js';
import {
  MasterAdmin,
  RealmAdmin,
} from '../decorators/admin-access.decorator.js';
import type { CreateRealmRequest } from '../schemas/create-realm.schema.js';
import { createRealmSchema } from '../schemas/create-realm.schema.js';
import {
  RealmResponse,
  realmResponseSchema,
  toRealmResponse,
} from '../schemas/realm.response.js';

@ApiTags('Admin: Realms')
@Controller('admin/realms')
export class AdminRealmsController {
  constructor(
    private readonly createRealm: CreateRealmUseCase,
    private readonly listRealms: ListRealmsUseCase,
    private readonly getRealm: GetRealmUseCase,
  ) {}

  @Post()
  @MasterAdmin()
  @ApiOperation({
    summary: 'Create a realm',
    description:
      'Creates the realm with its admin role and signing key, and optionally its first admin.',
  })
  @ApiBody({ schema: openApiSchema(createRealmSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(realmResponseSchema) })
  @ApiConflictResponse({ schema: openApiSchema(errorResponseSchema) })
  @ApiUnprocessableEntityResponse({
    schema: openApiSchema(errorResponseSchema),
  })
  async create(
    @Body(new ZodValidationPipe(createRealmSchema)) body: CreateRealmRequest,
  ): Promise<RealmResponse> {
    const { realm } = await this.createRealm.execute(body);
    return toRealmResponse(realm);
  }

  @Get()
  @MasterAdmin()
  @ApiOperation({ summary: 'List realms' })
  @ApiOkResponse({ schema: openApiSchema(z.array(realmResponseSchema)) })
  async list(): Promise<RealmResponse[]> {
    const realms = await this.listRealms.execute();
    return realms.map(toRealmResponse);
  }

  @Get(':realm')
  @RealmAdmin()
  @ApiOperation({ summary: 'Get a realm' })
  @ApiParam({ name: 'realm', example: 'shop' })
  @ApiOkResponse({ schema: openApiSchema(realmResponseSchema) })
  @ApiNotFoundResponse({ schema: openApiSchema(errorResponseSchema) })
  async get(@Param('realm') realm: string): Promise<RealmResponse> {
    return toRealmResponse(await this.getRealm.execute(realm));
  }
}
