import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { z } from 'zod';
import { errorResponseSchema } from '../../../../shared/presentation/openapi/error-response.schema.js';
import { openApiSchema } from '../../../../shared/presentation/openapi/openapi-schema.js';
import { ZodValidationPipe } from '../../../../shared/presentation/pipes/zod-validation.pipe.js';
import { CreateUserUseCase } from '../../../users/application/use-cases/create-user.use-case.js';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.use-case.js';
import { ListUsersUseCase } from '../../../users/application/use-cases/list-users.use-case.js';
import { ResetUserPasswordUseCase } from '../../../users/application/use-cases/reset-user-password.use-case.js';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case.js';
import { RealmAdmin } from '../decorators/admin-access.decorator.js';
import type {
  CreateUserRequest,
  ListUsersQuery,
  ResetPasswordRequest,
  UpdateUserRequest,
  UserResponse,
} from '../schemas/user.schemas.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
  toUserResponse,
  updateUserSchema,
  userIdSchema,
  userResponseSchema,
} from '../schemas/user.schemas.js';

const errorResponse = { schema: openApiSchema(errorResponseSchema) };

@ApiTags('Admin: Users')
@RealmAdmin()
@ApiParam({ name: 'realm', example: 'shop' })
@ApiNotFoundResponse(errorResponse)
@Controller('admin/realms/:realm/users')
export class AdminUsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly resetUserPassword: ResetUserPasswordUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the users of a realm' })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiOkResponse({ schema: openApiSchema(z.array(userResponseSchema)) })
  @ApiBadRequestResponse(errorResponse)
  async list(
    @Param('realm') realm: string,
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQuery,
  ): Promise<UserResponse[]> {
    const users = await this.listUsers.execute({ realmName: realm, ...query });
    return users.map(toUserResponse);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiBody({ schema: openApiSchema(createUserSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(userResponseSchema) })
  @ApiConflictResponse(errorResponse)
  @ApiUnprocessableEntityResponse(errorResponse)
  async create(
    @Param('realm') realm: string,
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserRequest,
  ): Promise<UserResponse> {
    return toUserResponse(
      await this.createUser.execute({ realmName: realm, ...body }),
    );
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get a user' })
  @ApiOkResponse({ schema: openApiSchema(userResponseSchema) })
  async get(
    @Param('realm') realm: string,
    @Param('userId', new ZodValidationPipe(userIdSchema)) userId: string,
  ): Promise<UserResponse> {
    return toUserResponse(
      await this.getUser.execute({ realmName: realm, userId }),
    );
  }

  @Patch(':userId')
  @ApiOperation({
    summary: 'Enable, disable or mark the email of a user as verified',
    description:
      'The last enabled admin of a realm cannot be disabled, so the realm always keeps an admin.',
  })
  @ApiBody({ schema: openApiSchema(updateUserSchema, 'input') })
  @ApiOkResponse({ schema: openApiSchema(userResponseSchema) })
  @ApiConflictResponse(errorResponse)
  async update(
    @Param('realm') realm: string,
    @Param('userId', new ZodValidationPipe(userIdSchema)) userId: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserRequest,
  ): Promise<UserResponse> {
    return toUserResponse(
      await this.updateUser.execute({
        realmName: realm,
        userId,
        changes: body,
      }),
    );
  }

  @Put(':userId/password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Set a new password for a user' })
  @ApiBody({ schema: openApiSchema(resetPasswordSchema, 'input') })
  @ApiNoContentResponse()
  @ApiUnprocessableEntityResponse(errorResponse)
  async resetPassword(
    @Param('realm') realm: string,
    @Param('userId', new ZodValidationPipe(userIdSchema)) userId: string,
    @Body(new ZodValidationPipe(resetPasswordSchema))
    body: ResetPasswordRequest,
  ): Promise<void> {
    await this.resetUserPassword.execute({
      realmName: realm,
      userId,
      password: body.password,
    });
  }
}
