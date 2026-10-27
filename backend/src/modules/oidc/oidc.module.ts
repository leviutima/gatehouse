import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { RealmsModule } from '../realms/realms.module.js';
import { SigningKeysModule } from '../signing-keys/signing-keys.module.js';
import { RealmIssuer } from './application/realm-issuer.js';
import { AccessTokenIssuer } from './application/services/access-token-issuer.js';
import { IssueClientCredentialsTokenUseCase } from './application/use-cases/issue-client-credentials-token.use-case.js';
import { ConfigRealmIssuer } from './infrastructure/config-realm-issuer.js';
import { JwksController } from './presentation/controllers/jwks.controller.js';
import { TokenController } from './presentation/controllers/token.controller.js';

@Module({
  imports: [RealmsModule, ClientsModule, SigningKeysModule],
  controllers: [JwksController, TokenController],
  providers: [
    { provide: RealmIssuer, useClass: ConfigRealmIssuer },
    AccessTokenIssuer,
    IssueClientCredentialsTokenUseCase,
  ],
})
export class OidcModule {}
