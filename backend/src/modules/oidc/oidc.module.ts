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
import { IdTokenHintReader } from './application/services/id-token-hint-reader.js';
import { IdTokenIssuer } from './application/services/id-token-issuer.js';
import { RefreshTokenIssuer } from './application/services/refresh-token-issuer.js';
import { UserTokenIssuer } from './application/services/user-token-issuer.js';
import { AuthorizeUseCase } from './application/use-cases/authorize.use-case.js';
import { EndSessionUseCase } from './application/use-cases/end-session.use-case.js';
import { ExchangeAuthorizationCodeUseCase } from './application/use-cases/exchange-authorization-code.use-case.js';
import { GetUserInfoUseCase } from './application/use-cases/get-user-info.use-case.js';
import { IssueClientCredentialsTokenUseCase } from './application/use-cases/issue-client-credentials-token.use-case.js';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case.js';
import { SignInUseCase } from './application/use-cases/sign-in.use-case.js';
import { AuthorizationCodeRepository } from './domain/repositories/authorization-code.repository.js';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository.js';
import { ConfigRealmIssuer } from './infrastructure/config-realm-issuer.js';
import { S256CodeChallengeVerifier } from './infrastructure/crypto/s256-code-challenge-verifier.js';
import { RealmAccessTokenVerifier } from './infrastructure/realm-access-token-verifier.js';
import { PrismaAuthorizationCodeRepository } from './infrastructure/repositories/prisma-authorization-code.repository.js';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository.js';
import { AuthorizationController } from './presentation/controllers/authorization.controller.js';
import { JwksController } from './presentation/controllers/jwks.controller.js';
import { LogoutController } from './presentation/controllers/logout.controller.js';
import { TokenController } from './presentation/controllers/token.controller.js';
import { UserInfoController } from './presentation/controllers/user-info.controller.js';
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
  controllers: [
    JwksController,
    TokenController,
    AuthorizationController,
    UserInfoController,
    LogoutController,
  ],
  providers: [
    { provide: RealmIssuer, useClass: ConfigRealmIssuer },
    { provide: TokenVerifier, useClass: RealmAccessTokenVerifier },
    {
      provide: AuthorizationCodeRepository,
      useClass: PrismaAuthorizationCodeRepository,
    },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
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
    RefreshTokenIssuer,
    UserTokenIssuer,
    RefreshTokensUseCase,
    GetUserInfoUseCase,
    IdTokenHintReader,
    EndSessionUseCase,
    LoginCookies,
  ],
  exports: [TokenVerifier],
})
export class OidcModule {}
