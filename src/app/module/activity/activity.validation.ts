import { z } from 'zod';

const createActivitySchema = z.object({
  body: z.object({
    destinationId: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().min(1),
    type: z.string().min(1),
    price: z.number(),
    duration: z.string().min(1),
    images: z.array(z.string()).optional(),
    location: z.string().optional(),
  }),
});

const updateActivitySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    destinationId: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    price: z.number().optional(),
    duration: z.string().min(1).optional(),
    images: z.array(z.string()).optional(),
    location: z.string().optional().nullable(),
    rating: z.number().min(0).max(5).optional(),
  }),
});

const deleteActivitySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const listActivitiesQuerySchema = z.object({
  query: z.object({
    destinationId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    sortBy: z
      .enum(['name', 'price', 'createdAt', 'rating', 'type'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
  }),
});

const byDestinationParamsSchema = z.object({
  params: z.object({ destinationId: z.string().uuid() }),
});

export const ActivityValidation = {
  createActivitySchema,
  updateActivitySchema,
  deleteActivitySchema,
  listActivitiesQuerySchema,
  byDestinationParamsSchema,
};
