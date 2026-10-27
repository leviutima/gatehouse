import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../../../../shared/presentation/decorators/public.decorator.js';
import { GetRealmJwksUseCase } from '../../application/use-cases/get-realm-jwks.use-case.js';
import type { PublishedJwk } from '../../domain/jwk.js';

export interface JwkSetResponse {
  keys: PublishedJwk[];
}

@Public()
@Controller('realms/:realm/protocol/openid-connect')
export class JwksController {
  constructor(private readonly getRealmJwks: GetRealmJwksUseCase) {}

  @Get('certs')
  @Header('Cache-Control', 'public, max-age=300')
  async certs(@Param('realm') realm: string): Promise<JwkSetResponse> {
    return { keys: await this.getRealmJwks.execute(realm) };
  }
}
