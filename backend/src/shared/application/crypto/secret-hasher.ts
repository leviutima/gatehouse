export abstract class SecretHasher {
  abstract hash(secret: string): string;
  abstract verify(hash: string, secret: string): boolean;
}
