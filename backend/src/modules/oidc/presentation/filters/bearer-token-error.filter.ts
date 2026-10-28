import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { BearerTokenError } from '../../application/errors/bearer-token.error.js';

@Catch(BearerTokenError)
export class BearerTokenErrorFilter implements ExceptionFilter<BearerTokenError> {
  catch(error: BearerTokenError, host: ArgumentsHost): void {
    const status =
      error.code === 'insufficient_scope'
        ? HttpStatus.FORBIDDEN
        : HttpStatus.UNAUTHORIZED;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .setHeader('WWW-Authenticate', `Bearer error="${error.code}"`)
      .setHeader('Cache-Control', 'no-store')
      .json({ error: error.code, error_description: error.description });
  }
}
