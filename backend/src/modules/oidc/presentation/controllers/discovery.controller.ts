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
import {
  DiscoveryDocument,
  GetDiscoveryDocumentUseCase,
} from '../../application/use-cases/get-discovery-document.use-case.js';

@ApiTags('OpenID Connect')
@Public()
@Controller('realms/:realm/.well-known')
export class DiscoveryController {
  constructor(
    private readonly getDiscoveryDocument: GetDiscoveryDocumentUseCase,
  ) {}

  @Get('openid-configuration')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({
    summary: 'OpenID Provider configuration',
    description:
      'Discovery document of the realm: endpoints, supported grants, scopes, algorithms and PKCE methods.',
  })
  @ApiParam({ name: 'realm', example: 'master' })
  @ApiOkResponse({ description: 'OpenID Connect Discovery 1.0 metadata' })
  @ApiNotFoundResponse({ schema: openApiSchema(errorResponseSchema) })
  configuration(@Param('realm') realm: string): Promise<DiscoveryDocument> {
    return this.getDiscoveryDocument.execute(realm);
  }
}
