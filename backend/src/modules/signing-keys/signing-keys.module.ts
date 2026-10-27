import { Module } from '@nestjs/common';
import { RealmsModule } from '../realms/realms.module.js';
import { KeyPairGenerator } from './application/key-pair-generator.js';
import { SigningKeyProvisioner } from './application/services/signing-key-provisioner.js';
import { GetRealmJwksUseCase } from './application/use-cases/get-realm-jwks.use-case.js';
import { SigningKeyRepository } from './domain/repositories/signing-key.repository.js';
import { JoseEs256KeyPairGenerator } from './infrastructure/crypto/jose-es256-key-pair-generator.js';
import { PrismaSigningKeyRepository } from './infrastructure/repositories/prisma-signing-key.repository.js';
import { JwksController } from './presentation/controllers/jwks.controller.js';

@Module({
  imports: [RealmsModule],
  controllers: [JwksController],
  providers: [
    { provide: SigningKeyRepository, useClass: PrismaSigningKeyRepository },
    { provide: KeyPairGenerator, useClass: JoseEs256KeyPairGenerator },
    SigningKeyProvisioner,
    GetRealmJwksUseCase,
  ],
  exports: [SigningKeyRepository, SigningKeyProvisioner],
})
export class SigningKeysModule {}
