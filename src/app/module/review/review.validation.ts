import { z } from 'zod';

const createReviewSchema = z.object({
  body: z.object({
    destinationId: z.string().uuid({ message: 'Destination ID must be a valid UUID' }),
    rating: z.number().min(1).max(5),
    comment: z.string().min(1, { message: 'Comment is required' }),
    images: z.array(z.string()).max(10).optional(),
  }),
});

const adminListReviewsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
    destinationId: z.string().uuid().optional(),
    search: z.string().optional(),
  }),
});

const listDestinationReviewsSchema = z.object({
  params: z.object({
    destinationId: z.string().uuid(),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  }),
});

const deleteReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().uuid(),
  }),
});

export const ReviewValidation = {
  createReviewSchema,
  adminListReviewsSchema,
  listDestinationReviewsSchema,
  deleteReviewSchema,
};
