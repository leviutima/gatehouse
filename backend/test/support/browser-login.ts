import { createHash, randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';
import type { App } from 'supertest/types.js';

export interface Pkce {
  verifier: string;
  challenge: string;
}

export function pkce(): Pkce {
  const verifier = randomBytes(32).toString('base64url');
  return {
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
  };
}

export function cookieFrom(
  response: Response,
  name: string,
): string | undefined {
  const header = response.headers['set-cookie'] as unknown;
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  return cookies.find((value) => value.startsWith(`${name}=`))?.split(';')[0];
}

export interface BrowserLogin {
  realm: string;
  clientId: string;
  redirectUri: string;
  identifier: string;
  password: string;
  scope?: string;
  nonce?: string;
}

export interface BrowserLoginResult {
  code: string;
  sessionCookie: string;
  pkce: Pkce;
}

export function authorizationQuery(
  login: BrowserLogin,
  challenge: Pkce,
): string {
  return new URLSearchParams({
    response_type: 'code',
    client_id: login.clientId,
    redirect_uri: login.redirectUri,
    scope: login.scope ?? 'openid profile email',
    state: 'state-1',
    nonce: login.nonce ?? 'nonce-1',
    code_challenge: challenge.challenge,
    code_challenge_method: 'S256',
  }).toString();
}

export async function signInThroughBrowser(
  app: INestApplication<App>,
  login: BrowserLogin,
): Promise<BrowserLoginResult> {
  const challenge = pkce();
  const authPath = `/realms/${login.realm}/protocol/openid-connect/auth`;
  const query = authorizationQuery(login, challenge);

  const page = await request(app.getHttpServer())
    .get(`${authPath}?${query}`)
    .expect(200);
  const csrfToken = /name="csrf_token" value="([^"]+)"/.exec(page.text)![1];

  const signedIn = await request(app.getHttpServer())
    .post(`${authPath}?${query}`)
    .set('Cookie', cookieFrom(page, 'GATEHOUSE_LOGIN_CSRF')!)
    .type('form')
    .send({
      csrf_token: csrfToken,
      identifier: login.identifier,
      password: login.password,
    })
    .expect(303);

  const location = new URL(signedIn.headers.location as string);
  return {
    code: location.searchParams.get('code')!,
    sessionCookie: cookieFrom(signedIn, 'GATEHOUSE_SESSION')!,
    pkce: challenge,
  };
}
