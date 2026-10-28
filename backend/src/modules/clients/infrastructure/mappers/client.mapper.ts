import type { Client as ClientRow } from '../../../../generated/prisma/client.js';
import { Client } from '../../domain/entities/client.entity.js';

export const ClientMapper = {
  toDomain(row: ClientRow): Client {
    return new Client({
      id: row.id,
      realmId: row.realmId,
      clientId: row.clientId,
      name: row.name,
      type: row.type,
      secretHash: row.secretHash,
      redirectUris: row.redirectUris,
      postLogoutRedirectUris: row.postLogoutRedirectUris,
      grantTypes: row.grantTypes,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
};
