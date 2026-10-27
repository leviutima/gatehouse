import type { LoginIdentifier } from '../../../realms/domain/login-identifier.js';

export interface LoginPageModel {
  realmDisplayName: string;
  loginIdentifier: LoginIdentifier;
  formAction: string;
  csrfToken: string;
  identifier: string;
  failed: boolean;
}

export interface ErrorPageModel {
  message: string;
}

export abstract class LoginTheme {
  abstract loginPage(model: LoginPageModel): string;
  abstract errorPage(model: ErrorPageModel): string;
}
