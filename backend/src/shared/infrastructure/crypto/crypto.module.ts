import { Global, Module } from '@nestjs/common';
import { PasswordHasher } from '../../application/crypto/password-hasher.js';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';

@Global()
@Module({
  providers: [{ provide: PasswordHasher, useClass: Argon2PasswordHasher }],
  exports: [PasswordHasher],
})
export class CryptoModule {}
