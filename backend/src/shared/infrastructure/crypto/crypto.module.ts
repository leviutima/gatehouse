import { Global, Module } from '@nestjs/common';
import { KeyEncryptor } from '../../application/crypto/key-encryptor.js';
import { PasswordHasher } from '../../application/crypto/password-hasher.js';
import { SecretGenerator } from '../../application/crypto/secret-generator.js';
import { SecretHasher } from '../../application/crypto/secret-hasher.js';
import { AesGcmKeyEncryptor } from './aes-gcm-key-encryptor.js';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';
import { RandomSecretGenerator } from './random-secret-generator.js';
import { Sha256SecretHasher } from './sha256-secret-hasher.js';

@Global()
@Module({
  providers: [
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: SecretGenerator, useClass: RandomSecretGenerator },
    { provide: SecretHasher, useClass: Sha256SecretHasher },
    { provide: KeyEncryptor, useClass: AesGcmKeyEncryptor },
  ],
  exports: [PasswordHasher, SecretGenerator, SecretHasher, KeyEncryptor],
})
export class CryptoModule {}
