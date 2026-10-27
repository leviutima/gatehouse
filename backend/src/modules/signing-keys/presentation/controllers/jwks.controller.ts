import { Controller, Get, Header, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../../../shared/presentation/decorators/public.decorator.js';
import { errorResponseSchema } from '../../../../shared/presentation/openapi/error-response.schema.js';
import { openApiSchema } from '../../../../shared/presentation/openapi/openapi-schema.js';
import { GetRealmJwksUseCase } from '../../application/use-cases/get-realm-jwks.use-case.js';
import {
  JwkSetResponse,
  jwkSetResponseSchema,
} from '../schemas/jwk-set.response.js';

@ApiTags('OpenID Connect')
@Public()
@Controller('realms/:realm/protocol/openid-connect')
export class JwksController {
  constructor(private readonly getRealmJwks: GetRealmJwksUseCase) {}

  @Get('certs')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({
    summary: 'JSON Web Key Set of the realm',
    description:
      'Public keys that verify the tokens issued by the realm: the active key and the passive keys still in rotation.',
  })
  @ApiParam({ name: 'realm', example: 'master' })
  @ApiOkResponse({ schema: openApiSchema(jwkSetResponseSchema) })
  @ApiNotFoundResponse({ schema: openApiSchema(errorResponseSchema) })
  async certs(@Param('realm') realm: string): Promise<JwkSetResponse> {
    return { keys: await this.getRealmJwks.execute(realm) };
  }
}
