import { z } from 'zod';

const saveDestinationSchema = z.object({
  body: z.object({
    destinationId: z.string().min(1, 'destinationId is required'),
  }),
});

const deleteSavedDestinationSchema = z.object({
  params: z.object({
    destinationId: z.string().min(1, 'destinationId is required'),
  }),
});

export const SavedDestinationValidation = {
  saveDestinationSchema,
  deleteSavedDestinationSchema,
};
