import { z } from 'zod';
import type { User } from '../../../users/domain/entities/user.entity.js';

export const userIdSchema = z.uuid();

export const listUsersQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const createUserSchema = z.object({
  username: z
    .string()
    .optional()
    .meta({ description: 'Ignored when the realm uses the email as username' }),
  email: z.email(),
  password: z.string(),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .strictObject({
    enabled: z.boolean(),
    emailVerified: z.boolean(),
  })
  .partial();

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({ password: z.string() });

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

export const userResponseSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    enabled: user.enabled,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
