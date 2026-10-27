import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { DefaultLoginTheme } from './default-login-theme.js';
import type { LoginPageModel } from './login-theme.js';

describe('DefaultLoginTheme', () => {
  const theme = new DefaultLoginTheme();
  const model: LoginPageModel = {
    realmDisplayName: 'Shop',
    loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
    formAction: '/realms/shop/protocol/openid-connect/auth?client_id=web',
    csrfToken: 'csrf-1',
    identifier: '',
    failed: false,
  };

  it('renders a form posting the credentials and the CSRF token', () => {
    const html = theme.loginPage(model);

    expect(html).toContain(
      '<form method="post" action="/realms/shop/protocol/openid-connect/auth?client_id=web">',
    );
    expect(html).toContain('name="csrf_token" value="csrf-1"');
    expect(html).toContain('name="identifier"');
    expect(html).toContain('type="password"');
    expect(html).not.toContain('role="alert"');
  });

  it('labels the identifier after the realm login identifier', () => {
    expect(
      theme.loginPage({ ...model, loginIdentifier: LoginIdentifier.EMAIL }),
    ).toContain('type="email"');
  });

  it('shows one message for every failed sign-in', () => {
    expect(theme.loginPage({ ...model, failed: true })).toContain(
      'Those credentials did not work. Check them and try again.',
    );
  });

  it('escapes everything that comes from outside', () => {
    const html = theme.loginPage({
      ...model,
      realmDisplayName: '<script>alert(1)</script>',
      identifier: '"><img src=x onerror=alert(1)>',
      formAction: '/auth?a=1&b="2"',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('action="/auth?a=1&amp;b=&quot;2&quot;"');
  });

  it('escapes the message of the error page', () => {
    expect(theme.errorPage({ message: '<b>bad</b>' })).toContain(
      '&lt;b&gt;bad&lt;/b&gt;',
    );
  });
});
