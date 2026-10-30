import {
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Principal } from '../../../../shared/application/auth/principal.js';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator.js';
import { openApiSchema } from '../../../../shared/presentation/openapi/openapi-schema.js';
import { ACCESS_TOKEN_SECURITY } from '../../../../shared/presentation/openapi/setup-swagger.js';
import {
  GetUserInfoUseCase,
  UserInfo,
} from '../../application/use-cases/get-user-info.use-case.js';
import { BearerTokenErrorFilter } from '../filters/bearer-token-error.filter.js';
import { oauthErrorResponseSchema } from '../schemas/oauth-error-response.schema.js';
import { userInfoResponseSchema } from '../schemas/user-info.response.js';

@ApiTags('OpenID Connect')
@ApiBearerAuth(ACCESS_TOKEN_SECURITY)
@UseFilters(BearerTokenErrorFilter)
@Controller('realms/:realm/protocol/openid-connect')
export class UserInfoController {
  constructor(private readonly getUserInfo: GetUserInfoUseCase) {}

  @Get('userinfo')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'UserInfo endpoint',
    description:
      'Returns the claims of the signed-in user allowed by the scopes of the access token. Requires the openid scope.',
  })
  @ApiParam({ name: 'realm', example: 'master' })
  @ApiOkResponse({ schema: openApiSchema(userInfoResponseSchema) })
  @ApiUnauthorizedResponse({ schema: openApiSchema(oauthErrorResponseSchema) })
  @ApiForbiddenResponse({ schema: openApiSchema(oauthErrorResponseSchema) })
  read(
    @Param('realm') realm: string,
    @CurrentUser() principal: Principal,
  ): Promise<UserInfo> {
    return this.getUserInfo.execute({ realmName: realm, principal });
  }

  @Post('userinfo')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'UserInfo endpoint (POST)' })
  @ApiParam({ name: 'realm', example: 'master' })
  @ApiOkResponse({ schema: openApiSchema(userInfoResponseSchema) })
  readByPost(
    @Param('realm') realm: string,
    @CurrentUser() principal: Principal,
  ): Promise<UserInfo> {
    return this.getUserInfo.execute({ realmName: realm, principal });
  }
}
