import { z } from 'zod';

const datasetEnum = z.enum([
  'user-trips',
  'spending-patterns',
  'destination-trends',
  'booking-analytics',
]);

const chatHistorySchema = z.array(
  z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  }),
);

export const AIValidation = {
  analyzeSchema: z.object({
    body: z.object({
      dataset: datasetEnum,
    }),
  }),
  captionSchema: z.object({
    body: z.object({
      imageUrl: z.string().url({ message: 'Valid image URL required' }),
    }),
  }),
  chatSchema: z.object({
    body: z.object({
      message: z.string().min(1, 'message is required'),
      history: chatHistorySchema.optional(),
    }),
  }),
  generateContentSchema: z.object({
    body: z.object({
      type: z.enum(['destination', 'activity', 'accommodation']),
      context: z.object({
        name: z.string(),
        location: z.string().optional(),
        destinationName: z.string().optional(),
        isEdit: z.boolean().optional(),
      }),
    }),
  }),
};
