import { Global, Module } from '@nestjs/common';
import { ClientSecretHasher } from '../../application/crypto/client-secret-hasher.js';
import { PasswordHasher } from '../../application/crypto/password-hasher.js';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';
import { Sha256ClientSecretHasher } from './sha256-client-secret-hasher.js';

@Global()
@Module({
  providers: [
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: ClientSecretHasher, useClass: Sha256ClientSecretHasher },
  ],
  exports: [PasswordHasher, ClientSecretHasher],
})
export class CryptoModule {}
