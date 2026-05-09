import { z } from 'zod';

const saveDestinationSchema = z.object({
  body: z.object({
    destinationId: z.string().uuid(),
  }),
});

const deleteSavedDestinationSchema = z.object({
  params: z.object({
    destinationId: z.string().uuid(),
  }),
});

export const SavedDestinationValidation = {
  saveDestinationSchema,
  deleteSavedDestinationSchema,
};
