import { Injectable } from '@nestjs/common';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { escapeHtml } from './html.js';
import {
  ErrorPageModel,
  LoginPageModel,
  LoginTheme,
  LogoutConfirmPageModel,
  SignedOutPageModel,
} from './login-theme.js';

const IDENTIFIER_LABELS: Record<LoginIdentifier, string> = {
  [LoginIdentifier.USERNAME]: 'Username',
  [LoginIdentifier.EMAIL]: 'Email',
  [LoginIdentifier.USERNAME_OR_EMAIL]: 'Username or email',
};

const STYLES = `
  :root { color-scheme: light dark; --background: light-dark(#ffffff, #191919); --foreground: light-dark(#37352f, #d4d4d4); --muted: light-dark(#6f6e69, #9b9b9b); --border: light-dark(#dfdedb, #373737); --hover: light-dark(#4f4d48, #bdbdbd); --subtle: light-dark(#f7f6f3, #252525); }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; background: var(--background); color: var(--foreground); font: 14px/1.5 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  main { width: 100%; max-width: 360px; background: var(--background); border: 1px solid var(--border); border-radius: 6px; padding: 28px 24px; }
  h1 { margin: 0 0 2px; font-size: 1.25rem; font-weight: 600; }
  p.subtitle { margin: 0 0 20px; color: var(--muted); }
  label { display: block; margin: 14px 0 4px; font-weight: 500; }
  input { display: block; width: 100%; height: 36px; padding: 0 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--background); color: var(--foreground); font: inherit; transition: border-color 100ms; }
  input:hover { border-color: var(--muted); }
  input:-webkit-autofill { -webkit-text-fill-color: var(--foreground); box-shadow: 0 0 0 36px var(--background) inset; }
  button { display: block; width: 100%; height: 36px; margin-top: 20px; border: 0; border-radius: 4px; background: var(--foreground); color: var(--background); font: inherit; font-weight: 500; cursor: pointer; transition: background-color 100ms; }
  button:hover { background: var(--hover); }
  input:focus-visible, button:focus-visible { outline: 2px solid color-mix(in srgb, var(--foreground) 60%, transparent); outline-offset: 1px; }
  .error { display: flex; align-items: flex-start; gap: 10px; margin: 0 0 8px; padding: 10px 12px; border: 1px solid var(--muted); border-radius: 6px; background: var(--subtle); }
  .error svg { flex-shrink: 0; width: 16px; height: 16px; margin-top: 2px; }
`;

const ERROR_ICON = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 4.75v3.75M8 11.25v.01"/></svg>`;

@Injectable()
export class DefaultLoginTheme extends LoginTheme {
  loginPage(model: LoginPageModel): string {
    const label = IDENTIFIER_LABELS[model.loginIdentifier];
    const inputType =
      model.loginIdentifier === LoginIdentifier.EMAIL ? 'email' : 'text';
    const error = model.failed
      ? `<div class="error" role="alert">${ERROR_ICON}<span>Those credentials did not work. Check them and try again.</span></div>`
      : '';

    return page(
      `Sign in to ${model.realmDisplayName}`,
      `<h1>Sign in</h1>
      <p class="subtitle">${escapeHtml(model.realmDisplayName)}</p>
      ${error}
      <form method="post" action="${escapeHtml(model.formAction)}">
        <input type="hidden" name="csrf_token" value="${escapeHtml(model.csrfToken)}">
        <label for="identifier">${label}</label>
        <input id="identifier" name="identifier" type="${inputType}" value="${escapeHtml(model.identifier)}" autocomplete="username" required autofocus>
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        <button type="submit">Sign in</button>
      </form>`,
    );
  }

  logoutConfirmPage(model: LogoutConfirmPageModel): string {
    return page(
      `Sign out of ${model.realmDisplayName}`,
      `<h1>Sign out</h1>
      <p class="subtitle">Do you want to sign out of ${escapeHtml(model.realmDisplayName)}?</p>
      <form method="post" action="${escapeHtml(model.formAction)}">
        <input type="hidden" name="csrf_token" value="${escapeHtml(model.csrfToken)}">
        <button type="submit">Sign out</button>
      </form>`,
    );
  }

  signedOutPage(model: SignedOutPageModel): string {
    return page(
      'Signed out',
      `<h1>You are signed out</h1>
      <p class="subtitle">${escapeHtml(model.realmDisplayName)}</p>`,
    );
  }

  errorPage(model: ErrorPageModel): string {
    return page(
      'Sign-in error',
      `<h1>We could not sign you in</h1>
      <p class="subtitle">${escapeHtml(model.message)}</p>`,
    );
  }
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}
