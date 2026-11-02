import type { LoginIdentifier } from '../../../realms/domain/login-identifier.js';

export interface LoginPageModel {
  realmDisplayName: string;
  loginIdentifier: LoginIdentifier;
  formAction: string;
  csrfToken: string;
  identifier: string;
  failed: boolean;
}

export interface LogoutConfirmPageModel {
  realmDisplayName: string;
  formAction: string;
  csrfToken: string;
}

export interface SignedOutPageModel {
  realmDisplayName: string;
}

export interface ErrorPageModel {
  message: string;
}

export abstract class LoginTheme {
  abstract loginPage(model: LoginPageModel): string;
  abstract logoutConfirmPage(model: LogoutConfirmPageModel): string;
  abstract signedOutPage(model: SignedOutPageModel): string;
  abstract errorPage(model: ErrorPageModel): string;
}
