import { z } from 'zod';

const createActivitySchema = z.object({
  body: z.object({
    destinationId: z.string({ message: 'Destination ID is required' }),
    name: z.string({ message: 'Name is required' }),
    description: z.string({ message: 'Description is required' }),
    type: z.string({ message: 'Type is required' }),
    price: z.number({ message: 'Price is required' }),
    duration: z.string({ message: 'Duration is required' }),
    images: z.array(z.string()).optional(),
    location: z.string().optional(),
  }),
});

export const ActivityValidation = {
  createActivitySchema,
};
