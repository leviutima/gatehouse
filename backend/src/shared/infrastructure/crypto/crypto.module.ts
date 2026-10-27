import { Global, Module } from '@nestjs/common';
import { ClientSecretHasher } from '../../application/crypto/client-secret-hasher.js';
import { KeyEncryptor } from '../../application/crypto/key-encryptor.js';
import { PasswordHasher } from '../../application/crypto/password-hasher.js';
import { AesGcmKeyEncryptor } from './aes-gcm-key-encryptor.js';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';
import { Sha256ClientSecretHasher } from './sha256-client-secret-hasher.js';

@Global()
@Module({
  providers: [
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: ClientSecretHasher, useClass: Sha256ClientSecretHasher },
    { provide: KeyEncryptor, useClass: AesGcmKeyEncryptor },
  ],
  exports: [PasswordHasher, ClientSecretHasher, KeyEncryptor],
})
export class CryptoModule {}
