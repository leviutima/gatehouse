import { z } from 'zod';
import { ClientType } from '../../../clients/domain/client-type.js';
import type { Client } from '../../../clients/domain/entities/client.entity.js';
import { GrantType } from '../../../clients/domain/grant-type.js';

export const createClientSchema = z.object({
  clientId: z.string().meta({ example: 'billing' }),
  name: z.string().meta({ example: 'Billing service' }),
  type: z.enum(ClientType),
  redirectUris: z.array(z.string()).default([]),
  grantTypes: z.array(z.enum(GrantType)),
});

export type CreateClientRequest = z.infer<typeof createClientSchema>;

export const updateClientSchema = z
  .strictObject({
    name: z.string(),
    redirectUris: z.array(z.string()),
    grantTypes: z.array(z.enum(GrantType)),
    enabled: z.boolean(),
  })
  .partial()
  .meta({
    description: 'The client id and the type cannot change after creation.',
  });

export type UpdateClientRequest = z.infer<typeof updateClientSchema>;

export const clientResponseSchema = z.object({
  id: z.uuid(),
  clientId: z.string(),
  name: z.string(),
  type: z.enum(ClientType),
  redirectUris: z.array(z.string()),
  grantTypes: z.array(z.enum(GrantType)),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ClientResponse = z.infer<typeof clientResponseSchema>;

export const createdClientResponseSchema = clientResponseSchema.extend({
  secret: z.string().nullable().meta({
    description:
      'Shown only once. Null for public clients, which have no secret.',
  }),
});

export type CreatedClientResponse = z.infer<typeof createdClientResponseSchema>;

export const clientSecretResponseSchema = z.object({
  secret: z.string().meta({ description: 'Shown only once.' }),
});

export type ClientSecretResponse = z.infer<typeof clientSecretResponseSchema>;

export function toClientResponse(client: Client): ClientResponse {
  return {
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    type: client.type,
    redirectUris: [...client.redirectUris],
    grantTypes: [...client.grantTypes],
    enabled: client.enabled,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}
