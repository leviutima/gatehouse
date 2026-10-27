import { Injectable } from '@nestjs/common';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { escapeHtml } from './html.js';
import { ErrorPageModel, LoginPageModel, LoginTheme } from './login-theme.js';

const IDENTIFIER_LABELS: Record<LoginIdentifier, string> = {
  [LoginIdentifier.USERNAME]: 'Username',
  [LoginIdentifier.EMAIL]: 'Email',
  [LoginIdentifier.USERNAME_OR_EMAIL]: 'Username or email',
};

const STYLES = `
  :root { color-scheme: light dark; --bg: #f4f5f7; --card: #fff; --text: #1c1e21; --muted: #5f6368; --border: #d5d8dc; --accent: #2457d6; --error: #b3261e; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111317; --card: #1b1e23; --text: #e8eaed; --muted: #a0a4a8; --border: #33373d; --accent: #7aa2ff; --error: #f2b8b5; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: 100%; max-width: 380px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 32px 28px; }
  h1 { margin: 0 0 4px; font-size: 1.4rem; }
  p.subtitle { margin: 0 0 24px; color: var(--muted); }
  label { display: block; margin: 16px 0 6px; font-weight: 600; font-size: .9rem; }
  input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: transparent; color: inherit; font: inherit; }
  input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  button { width: 100%; margin-top: 24px; padding: 11px; border: 0; border-radius: 8px; background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  .error { margin: 0 0 8px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--error); color: var(--error); font-size: .9rem; }
`;

@Injectable()
export class DefaultLoginTheme extends LoginTheme {
  loginPage(model: LoginPageModel): string {
    const label = IDENTIFIER_LABELS[model.loginIdentifier];
    const inputType =
      model.loginIdentifier === LoginIdentifier.EMAIL ? 'email' : 'text';
    const error = model.failed
      ? `<p class="error" role="alert">Those credentials did not work. Check them and try again.</p>`
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
