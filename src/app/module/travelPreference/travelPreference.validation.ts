import { z } from 'zod';

const updatePreferenceSchema = z.object({
  body: z.object({
    interests: z.array(z.string()).optional(),
    budgetRange: z.string().optional(),
    travelStyle: z.enum(['ADVENTURE', 'RELAXATION', 'CULTURAL', 'LUXURY', 'BUDGET', 'FAMILY']).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    preferredClimate: z.string().optional(),
    mobilityNeeds: z.string().optional(),
  }),
});

export const TravelPreferenceValidation = {
  updatePreferenceSchema,
};
