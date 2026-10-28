import {
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  Param,
  Post,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBasicAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../../../shared/presentation/decorators/public.decorator.js';
import { errorResponseSchema } from '../../../../shared/presentation/openapi/error-response.schema.js';
import { openApiSchema } from '../../../../shared/presentation/openapi/openapi-schema.js';
import { OAuthError } from '../../application/errors/oauth.error.js';
import { ExchangeAuthorizationCodeUseCase } from '../../application/use-cases/exchange-authorization-code.use-case.js';
import { IssueClientCredentialsTokenUseCase } from '../../application/use-cases/issue-client-credentials-token.use-case.js';
import { OAuthErrorFilter } from '../filters/oauth-error.filter.js';
import {
  assertFormEncoded,
  parseTokenRequest,
  resolveClientCredentials,
} from '../http/token-request.parser.js';
import { oauthErrorResponseSchema } from '../schemas/oauth-error-response.schema.js';
import { tokenRequestSchema } from '../schemas/token-request.schema.js';
import {
  TokenResponse,
  tokenResponseSchema,
} from '../schemas/token-response.schema.js';

const CLIENT_CREDENTIALS = 'client_credentials';
const AUTHORIZATION_CODE = 'authorization_code';

@ApiTags('OpenID Connect')
@Public()
@UseFilters(OAuthErrorFilter)
@Controller('realms/:realm/protocol/openid-connect')
export class TokenController {
  constructor(
    private readonly issueClientCredentialsToken: IssueClientCredentialsTokenUseCase,
    private readonly exchangeAuthorizationCode: ExchangeAuthorizationCodeUseCase,
  ) {}

  @Post('token')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @ApiOperation({
    summary: 'Token endpoint',
    description:
      'Issues tokens for the client_credentials and authorization_code grants. Confidential clients authenticate with client_secret_basic or client_secret_post; public clients send only client_id and prove the code with PKCE.',
  })
  @ApiParam({ name: 'realm', example: 'master' })
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiBody({ schema: openApiSchema(tokenRequestSchema, 'input') })
  @ApiBasicAuth('client_secret_basic')
  @ApiOkResponse({ schema: openApiSchema(tokenResponseSchema) })
  @ApiBadRequestResponse({ schema: openApiSchema(oauthErrorResponseSchema) })
  @ApiUnauthorizedResponse({ schema: openApiSchema(oauthErrorResponseSchema) })
  @ApiNotFoundResponse({ schema: openApiSchema(errorResponseSchema) })
  async token(
    @Param('realm') realm: string,
    @Headers('content-type') contentType: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<TokenResponse> {
    assertFormEncoded(contentType);
    const request = parseTokenRequest(body);
    const credentials = () => resolveClientCredentials(authorization, request);

    if (request.grant_type === CLIENT_CREDENTIALS) {
      const { token, expiresIn } =
        await this.issueClientCredentialsToken.execute({
          realmName: realm,
          credentials: credentials(),
        });
      return {
        access_token: token,
        token_type: 'Bearer',
        expires_in: expiresIn,
      };
    }

    if (request.grant_type === AUTHORIZATION_CODE) {
      const tokens = await this.exchangeAuthorizationCode.execute({
        realmName: realm,
        credentials: credentials(),
        code: request.code,
        redirectUri: request.redirect_uri,
        codeVerifier: request.code_verifier,
      });
      return {
        access_token: tokens.accessToken,
        token_type: 'Bearer',
        expires_in: tokens.expiresIn,
        ...(tokens.idToken === null ? {} : { id_token: tokens.idToken }),
        scope: tokens.scope,
      };
    }

    throw OAuthError.unsupportedGrantType(request.grant_type);
  }
}
