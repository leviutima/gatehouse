export abstract class ClientSecretHasher {
  abstract hash(secret: string): string;
  abstract verify(hash: string, secret: string): boolean;
}
