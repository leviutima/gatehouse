import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { Public } from '../../../../shared/presentation/decorators/public.decorator.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { AuthorizeUseCase } from '../../application/use-cases/authorize.use-case.js';
import { SignInUseCase } from '../../application/use-cases/sign-in.use-case.js';
import { LoginCookies } from '../http/login-cookies.js';
import { LoginTheme } from '../login/login-theme.js';

const PAGE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'",
};

interface LoginFormState {
  identifier: string;
  failed: boolean;
}

@ApiExcludeController()
@Public()
@Controller('realms/:realm/protocol/openid-connect')
export class AuthorizationController {
  constructor(
    private readonly authorizeUseCase: AuthorizeUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly cookies: LoginCookies,
    private readonly theme: LoginTheme,
    private readonly secretGenerator: SecretGenerator,
  ) {}

  @Get('auth')
  async authorize(
    @Param('realm') realmName: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const outcome = await this.authorizeUseCase.execute({
      realmName,
      params: request.query,
      sessionToken: this.cookies.sessionToken(request),
    });

    switch (outcome.kind) {
      case 'rejected':
        return this.sendError(response, outcome.reason);
      case 'redirect':
        return response.redirect(302, outcome.location);
      case 'login_required':
        return this.sendLogin(request, response, outcome.realm, {
          identifier: '',
          failed: false,
        });
    }
  }

  @Post('auth')
  async signIn(
    @Param('realm') realmName: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (!this.cookies.isCsrfValid(request, body.csrf_token)) {
      return response.redirect(303, request.originalUrl);
    }

    const identifier =
      typeof body.identifier === 'string' ? body.identifier : '';
    const outcome = await this.signInUseCase.execute({
      realmName,
      params: request.query,
      credentials: {
        identifier,
        password: typeof body.password === 'string' ? body.password : '',
      },
    });

    switch (outcome.kind) {
      case 'rejected':
        return this.sendError(response, outcome.reason);
      case 'redirect':
        return response.redirect(303, outcome.location);
      case 'failed':
        return this.sendLogin(request, response, outcome.realm, {
          identifier,
          failed: true,
        });
      case 'signed_in':
        this.cookies.setSession(
          response,
          outcome.realm.name,
          outcome.sessionToken,
          outcome.realm.sessionMaxLifespan,
        );
        return response.redirect(303, outcome.location);
    }
  }

  private sendLogin(
    request: Request,
    response: Response,
    realm: Realm,
    { identifier, failed }: LoginFormState,
  ): void {
    const csrfToken =
      this.cookies.csrfToken(request) ?? this.secretGenerator.generate();
    this.cookies.setCsrf(response, realm.name, csrfToken);
    this.sendPage(
      response,
      200,
      this.theme.loginPage({
        realmDisplayName: realm.displayName,
        loginIdentifier: realm.loginIdentifier,
        formAction: request.originalUrl,
        csrfToken,
        identifier,
        failed,
      }),
    );
  }

  private sendError(response: Response, message: string): void {
    this.sendPage(response, 400, this.theme.errorPage({ message }));
  }

  private sendPage(response: Response, status: number, html: string): void {
    response.status(status).set(PAGE_HEADERS).send(html);
  }
}
