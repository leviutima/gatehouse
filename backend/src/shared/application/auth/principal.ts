export interface Principal {
  subject: string;
  realm: string;
  clientId: string;
  scopes: readonly string[];
}
