export abstract class RealmIssuer {
  abstract forRealm(realmName: string): string;
  abstract realmNameOf(issuer: string): string | null;
}
