import { Module } from '@nestjs/common';
import { TokenVerifier } from '../../shared/application/auth/token-verifier.js';
import { ClientsModule } from '../clients/clients.module.js';
import { RealmsModule } from '../realms/realms.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { SigningKeysModule } from '../signing-keys/signing-keys.module.js';
import { UsersModule } from '../users/users.module.js';
import { CodeChallengeVerifier } from './application/code-challenge-verifier.js';
import { RealmIssuer } from './application/realm-issuer.js';
import { AccessTokenIssuer } from './application/services/access-token-issuer.js';
import { AuthorizationCodeIssuer } from './application/services/authorization-code-issuer.js';
import { AuthorizationCompleter } from './application/services/authorization-completer.js';
import { AuthorizationRequestValidator } from './application/services/authorization-request-validator.js';
import { IdTokenIssuer } from './application/services/id-token-issuer.js';
import { AuthorizeUseCase } from './application/use-cases/authorize.use-case.js';
import { ExchangeAuthorizationCodeUseCase } from './application/use-cases/exchange-authorization-code.use-case.js';
import { IssueClientCredentialsTokenUseCase } from './application/use-cases/issue-client-credentials-token.use-case.js';
import { SignInUseCase } from './application/use-cases/sign-in.use-case.js';
import { AuthorizationCodeRepository } from './domain/repositories/authorization-code.repository.js';
import { ConfigRealmIssuer } from './infrastructure/config-realm-issuer.js';
import { S256CodeChallengeVerifier } from './infrastructure/crypto/s256-code-challenge-verifier.js';
import { RealmAccessTokenVerifier } from './infrastructure/realm-access-token-verifier.js';
import { PrismaAuthorizationCodeRepository } from './infrastructure/repositories/prisma-authorization-code.repository.js';
import { AuthorizationController } from './presentation/controllers/authorization.controller.js';
import { JwksController } from './presentation/controllers/jwks.controller.js';
import { TokenController } from './presentation/controllers/token.controller.js';
import { LoginCookies } from './presentation/http/login-cookies.js';
import { DefaultLoginTheme } from './presentation/login/default-login-theme.js';
import { LoginTheme } from './presentation/login/login-theme.js';

@Module({
  imports: [
    RealmsModule,
    ClientsModule,
    SigningKeysModule,
    UsersModule,
    SessionsModule,
  ],
  controllers: [JwksController, TokenController, AuthorizationController],
  providers: [
    { provide: RealmIssuer, useClass: ConfigRealmIssuer },
    { provide: TokenVerifier, useClass: RealmAccessTokenVerifier },
    {
      provide: AuthorizationCodeRepository,
      useClass: PrismaAuthorizationCodeRepository,
    },
    { provide: LoginTheme, useClass: DefaultLoginTheme },
    { provide: CodeChallengeVerifier, useClass: S256CodeChallengeVerifier },
    AccessTokenIssuer,
    IssueClientCredentialsTokenUseCase,
    AuthorizationCodeIssuer,
    AuthorizationRequestValidator,
    AuthorizationCompleter,
    AuthorizeUseCase,
    SignInUseCase,
    IdTokenIssuer,
    ExchangeAuthorizationCodeUseCase,
    LoginCookies,
  ],
  exports: [TokenVerifier],
})
export class OidcModule {}
