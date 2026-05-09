import { z } from 'zod';

const createReviewSchema = z.object({
  body: z.object({
    destinationId: z.string({ message: 'Destination ID is required' }),
    rating: z.number().min(1).max(5),
    comment: z.string({ message: 'Comment is required' }),
    images: z.array(z.string()).optional(),
  }),
});

export const ReviewValidation = {
  createReviewSchema,
};
