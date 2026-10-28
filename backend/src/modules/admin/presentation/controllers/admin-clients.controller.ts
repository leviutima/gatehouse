import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
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
import { CreateClientUseCase } from '../../../clients/application/use-cases/create-client.use-case.js';
import { GetClientUseCase } from '../../../clients/application/use-cases/get-client.use-case.js';
import { ListClientsUseCase } from '../../../clients/application/use-cases/list-clients.use-case.js';
import { RotateClientSecretUseCase } from '../../../clients/application/use-cases/rotate-client-secret.use-case.js';
import { UpdateClientUseCase } from '../../../clients/application/use-cases/update-client.use-case.js';
import { RealmAdmin } from '../decorators/admin-access.decorator.js';
import type {
  ClientResponse,
  ClientSecretResponse,
  CreateClientRequest,
  CreatedClientResponse,
  UpdateClientRequest,
} from '../schemas/client.schemas.js';
import {
  clientResponseSchema,
  clientSecretResponseSchema,
  createClientSchema,
  createdClientResponseSchema,
  toClientResponse,
  updateClientSchema,
} from '../schemas/client.schemas.js';

const errorResponse = { schema: openApiSchema(errorResponseSchema) };

@ApiTags('Admin: Clients')
@RealmAdmin()
@ApiParam({ name: 'realm', example: 'shop' })
@ApiNotFoundResponse(errorResponse)
@Controller('admin/realms/:realm/clients')
export class AdminClientsController {
  constructor(
    private readonly listClients: ListClientsUseCase,
    private readonly createClient: CreateClientUseCase,
    private readonly getClient: GetClientUseCase,
    private readonly updateClient: UpdateClientUseCase,
    private readonly rotateClientSecret: RotateClientSecretUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the clients of a realm' })
  @ApiOkResponse({ schema: openApiSchema(z.array(clientResponseSchema)) })
  async list(@Param('realm') realm: string): Promise<ClientResponse[]> {
    const clients = await this.listClients.execute(realm);
    return clients.map(toClientResponse);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Create a client',
    description:
      'A confidential client gets a generated secret, returned only in this response. Gatehouse keeps only its hash.',
  })
  @ApiBody({ schema: openApiSchema(createClientSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(createdClientResponseSchema) })
  @ApiConflictResponse(errorResponse)
  @ApiUnprocessableEntityResponse(errorResponse)
  async create(
    @Param('realm') realm: string,
    @Body(new ZodValidationPipe(createClientSchema)) body: CreateClientRequest,
  ): Promise<CreatedClientResponse> {
    const { client, secret } = await this.createClient.execute({
      realmName: realm,
      ...body,
    });
    return { ...toClientResponse(client), secret };
  }

  @Get(':clientId')
  @ApiOperation({ summary: 'Get a client' })
  @ApiParam({ name: 'clientId', example: 'billing' })
  @ApiOkResponse({ schema: openApiSchema(clientResponseSchema) })
  async get(
    @Param('realm') realm: string,
    @Param('clientId') clientId: string,
  ): Promise<ClientResponse> {
    return toClientResponse(
      await this.getClient.execute({ realmName: realm, clientId }),
    );
  }

  @Patch(':clientId')
  @ApiOperation({
    summary: 'Update a client',
    description: 'The resulting configuration must follow the client rules.',
  })
  @ApiParam({ name: 'clientId', example: 'billing' })
  @ApiBody({ schema: openApiSchema(updateClientSchema, 'input') })
  @ApiOkResponse({ schema: openApiSchema(clientResponseSchema) })
  @ApiUnprocessableEntityResponse(errorResponse)
  async update(
    @Param('realm') realm: string,
    @Param('clientId') clientId: string,
    @Body(new ZodValidationPipe(updateClientSchema)) body: UpdateClientRequest,
  ): Promise<ClientResponse> {
    return toClientResponse(
      await this.updateClient.execute({
        realmName: realm,
        clientId,
        changes: body,
      }),
    );
  }

  @Post(':clientId/secret')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Generate a new secret',
    description:
      'The previous secret stops working at once. The new one is returned only in this response.',
  })
  @ApiParam({ name: 'clientId', example: 'billing' })
  @ApiOkResponse({ schema: openApiSchema(clientSecretResponseSchema) })
  @ApiUnprocessableEntityResponse(errorResponse)
  async rotateSecret(
    @Param('realm') realm: string,
    @Param('clientId') clientId: string,
  ): Promise<ClientSecretResponse> {
    const secret = await this.rotateClientSecret.execute({
      realmName: realm,
      clientId,
    });
    return { secret };
  }
}
