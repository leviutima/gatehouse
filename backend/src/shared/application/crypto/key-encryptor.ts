export abstract class KeyEncryptor {
  abstract encrypt(plaintext: string): string;
  abstract decrypt(payload: string): string;
}
