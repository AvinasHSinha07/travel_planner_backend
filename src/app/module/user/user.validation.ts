import { z } from 'zod';
import { Role } from '@prisma/client';

const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(Role),
  }),
  params: z.object({
    userId: z.string().uuid(),
  }),
});

const listUsersQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
    sortBy: z.enum(['createdAt', 'name', 'email', 'role']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    suspended: z
      .enum(['all', 'true', 'false'])
      .optional()
      .default('all'),
  }),
});

const updateUserSuspensionSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
  body: z.object({
    isSuspended: z.boolean(),
  }),
});

export const UserValidation = {
  updateUserRoleSchema,
  listUsersQuerySchema,
  updateUserSuspensionSchema,
};
