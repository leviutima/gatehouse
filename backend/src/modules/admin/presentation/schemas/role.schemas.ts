import { z } from 'zod';
import type { Role } from '../../../roles/domain/entities/role.entity.js';

export const createRoleSchema = z.object({
  name: z.string().meta({ example: 'billing:read' }),
  description: z.string().max(255).optional(),
});

export type CreateRoleRequest = z.infer<typeof createRoleSchema>;

export const roleResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type RoleResponse = z.infer<typeof roleResponseSchema>;

export function toRoleResponse(role: Role): RoleResponse {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}
