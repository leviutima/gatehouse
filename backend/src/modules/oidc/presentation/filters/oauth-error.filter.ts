import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { OAuthError } from '../../application/errors/oauth.error.js';

@Catch(OAuthError)
export class OAuthErrorFilter implements ExceptionFilter<OAuthError> {
  catch(error: OAuthError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error.code === 'invalid_client'
        ? HttpStatus.UNAUTHORIZED
        : HttpStatus.BAD_REQUEST;

    if (status === HttpStatus.UNAUTHORIZED) {
      response.setHeader('WWW-Authenticate', 'Basic realm="gatehouse"');
    }
    response
      .status(status)
      .setHeader('Cache-Control', 'no-store')
      .setHeader('Pragma', 'no-cache')
      .json({ error: error.code, error_description: error.description });
  }
}
