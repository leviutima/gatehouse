import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Principal } from '../../application/auth/principal.js';
import { TokenVerifier } from '../../application/auth/token-verifier.js';
import { Public } from '../decorators/public.decorator.js';
import type { AuthenticatedRequest } from '../http/authenticated-request.js';
import { AccessTokenGuard } from './access-token.guard.js';

class SampleController {
  @Public()
  open(this: void) {}

  closed(this: void) {}
}

@Public()
class PublicController {
  anything(this: void) {}
}

const principal: Principal = {
  subject: 'user-1',
  realm: 'master',
  clientId: 'admin-console',
  scopes: ['openid'],
};

class FakeTokenVerifier extends TokenVerifier {
  verify(token: string): Promise<Principal | null> {
    return Promise.resolve(token === 'valid-token' ? principal : null);
  }
}

function createContext(
  handler: () => void,
  controller: new () => unknown,
  authorization?: string,
) {
  const request = { headers: { authorization } } as AuthenticatedRequest;
  const response = { setHeader: vi.fn() };
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, request, response };
}

describe('AccessTokenGuard', () => {
  const guard = new AccessTokenGuard(new Reflector(), new FakeTokenVerifier());
  const closed = SampleController.prototype.closed;

  it('lets a @Public() handler through without a token', async () => {
    const { context } = createContext(
      SampleController.prototype.open,
      SampleController,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('lets every handler of a @Public() controller through', async () => {
    const { context } = createContext(
      PublicController.prototype.anything,
      PublicController,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a protected route without a token', async () => {
    const { context, response } = createContext(closed, SampleController);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer',
    );
  });

  it.each(['Basic dXNlcjpwYXNz', 'Bearer', 'Bearer a b'])(
    'rejects a malformed authorization header: %s',
    async (header) => {
      const { context } = createContext(closed, SampleController, header);

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );

  it('rejects a token the verifier does not accept', async () => {
    const { context, response } = createContext(
      closed,
      SampleController,
      'Bearer forged-token',
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer error="invalid_token"',
    );
  });

  it('attaches the principal to the request for a valid token', async () => {
    const { context, request } = createContext(
      closed,
      SampleController,
      'bearer valid-token',
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.principal).toEqual(principal);
  });
});
