import { Module } from '@nestjs/common';
import { KeyPairGenerator } from './application/key-pair-generator.js';
import { EnsureActiveSigningKeyUseCase } from './application/use-cases/ensure-active-signing-key.use-case.js';
import { SigningKeyRepository } from './domain/repositories/signing-key.repository.js';
import { JoseEs256KeyPairGenerator } from './infrastructure/crypto/jose-es256-key-pair-generator.js';
import { PrismaSigningKeyRepository } from './infrastructure/repositories/prisma-signing-key.repository.js';

@Module({
  providers: [
    { provide: SigningKeyRepository, useClass: PrismaSigningKeyRepository },
    { provide: KeyPairGenerator, useClass: JoseEs256KeyPairGenerator },
    EnsureActiveSigningKeyUseCase,
  ],
  exports: [SigningKeyRepository, EnsureActiveSigningKeyUseCase],
})
export class SigningKeysModule {}
