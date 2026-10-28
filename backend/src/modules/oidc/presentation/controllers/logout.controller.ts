import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { Public } from '../../../../shared/presentation/decorators/public.decorator.js';
import {
  EndSessionOutcome,
  EndSessionUseCase,
} from '../../application/use-cases/end-session.use-case.js';
import { LoginCookies } from '../http/login-cookies.js';
import { sendPage } from '../http/pages.js';
import { LoginTheme } from '../login/login-theme.js';

@ApiExcludeController()
@Public()
@Controller('realms/:realm/protocol/openid-connect')
export class LogoutController {
  constructor(
    private readonly endSession: EndSessionUseCase,
    private readonly cookies: LoginCookies,
    private readonly theme: LoginTheme,
    private readonly secretGenerator: SecretGenerator,
  ) {}

  @Get('logout')
  async logout(
    @Param('realm') realmName: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const outcome = await this.endSession.execute({
      realmName,
      params: request.query,
      sessionToken: this.cookies.sessionToken(request),
      confirmed: false,
    });
    this.respond(request, response, outcome, 302);
  }

  @Post('logout')
  async confirmLogout(
    @Param('realm') realmName: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (!this.cookies.isCsrfValid(request, body.csrf_token)) {
      return response.redirect(303, request.originalUrl);
    }
    const outcome = await this.endSession.execute({
      realmName,
      params: request.query,
      sessionToken: this.cookies.sessionToken(request),
      confirmed: true,
    });
    this.respond(request, response, outcome, 303);
  }

  private respond(
    request: Request,
    response: Response,
    outcome: EndSessionOutcome,
    redirectStatus: number,
  ): void {
    switch (outcome.kind) {
      case 'rejected':
        return sendPage(
          response,
          400,
          this.theme.errorPage({ message: outcome.reason }),
        );
      case 'confirm': {
        const csrfToken =
          this.cookies.csrfToken(request) ?? this.secretGenerator.generate();
        this.cookies.setCsrf(response, outcome.realm.name, csrfToken);
        return sendPage(
          response,
          200,
          this.theme.logoutConfirmPage({
            realmDisplayName: outcome.realm.displayName,
            formAction: request.originalUrl,
            csrfToken,
          }),
        );
      }
      case 'signed_out':
        this.cookies.clearSession(response, outcome.realm.name);
        if (outcome.location) {
          return response.redirect(redirectStatus, outcome.location);
        }
        return sendPage(
          response,
          200,
          this.theme.signedOutPage({
            realmDisplayName: outcome.realm.displayName,
          }),
        );
    }
  }
}
