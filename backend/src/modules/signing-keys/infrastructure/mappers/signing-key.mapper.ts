import { z } from 'zod';
import type { SigningKey as SigningKeyRow } from '../../../../generated/prisma/client.js';
import { SigningKey } from '../../domain/entities/signing-key.entity.js';

const ecPublicJwkSchema = z.object({
  kty: z.literal('EC'),
  crv: z.literal('P-256'),
  x: z.string().min(1),
  y: z.string().min(1),
});

export const SigningKeyMapper = {
  toDomain(row: SigningKeyRow): SigningKey {
    return new SigningKey({
      id: row.id,
      realmId: row.realmId,
      algorithm: row.algorithm,
      status: row.status,
      publicJwk: ecPublicJwkSchema.parse(row.publicJwk),
      encryptedPrivateKey: row.encryptedPrivateKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
};
