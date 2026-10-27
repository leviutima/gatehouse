export abstract class RealmIssuer {
  abstract forRealm(realmName: string): string;
}
