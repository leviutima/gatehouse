import { Module } from '@nestjs/common';
import { RealmsModule } from '../realms/realms.module.js';
import { JwtSigner } from './application/jwt-signer.js';
import { JwtVerifier } from './application/jwt-verifier.js';
import { KeyPairGenerator } from './application/key-pair-generator.js';
import { RealmTokenSigner } from './application/services/realm-token-signer.js';
import { SigningKeyProvisioner } from './application/services/signing-key-provisioner.js';
import { GetRealmJwksUseCase } from './application/use-cases/get-realm-jwks.use-case.js';
import { SigningKeyRepository } from './domain/repositories/signing-key.repository.js';
import { JoseEs256KeyPairGenerator } from './infrastructure/crypto/jose-es256-key-pair-generator.js';
import { JoseJwtSigner } from './infrastructure/crypto/jose-jwt-signer.js';
import { JoseJwtVerifier } from './infrastructure/crypto/jose-jwt-verifier.js';
import { PrismaSigningKeyRepository } from './infrastructure/repositories/prisma-signing-key.repository.js';

@Module({
  imports: [RealmsModule],
  providers: [
    { provide: SigningKeyRepository, useClass: PrismaSigningKeyRepository },
    { provide: KeyPairGenerator, useClass: JoseEs256KeyPairGenerator },
    { provide: JwtSigner, useClass: JoseJwtSigner },
    { provide: JwtVerifier, useClass: JoseJwtVerifier },
    SigningKeyProvisioner,
    RealmTokenSigner,
    GetRealmJwksUseCase,
  ],
  exports: [
    SigningKeyRepository,
    JwtVerifier,
    SigningKeyProvisioner,
    RealmTokenSigner,
    GetRealmJwksUseCase,
  ],
})
export class SigningKeysModule {}
