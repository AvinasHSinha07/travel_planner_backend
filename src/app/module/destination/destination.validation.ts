import { z } from 'zod';

const createDestinationSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Name is required' }),
    country: z.string({ message: 'Country is required' }),
    description: z.string({ message: 'Description is required' }),
    summary: z.string({ message: 'Summary is required' }),
    images: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    category: z.string({ message: 'Category is required' }),
    bestSeason: z.string({ message: 'Best season is required' }),
    avgCostPerDay: z.number({ message: 'Average cost per day is required' }),
    currency: z.string().default('USD'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    isFeatured: z.boolean().optional(),
  }),
});

const updateDestinationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    country: z.string().optional(),
    description: z.string().optional(),
    summary: z.string().optional(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    bestSeason: z.string().optional(),
    avgCostPerDay: z.number().optional(),
    currency: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    isFeatured: z.boolean().optional(),
  }),
});

export const DestinationValidation = {
  createDestinationSchema,
  updateDestinationSchema,
};
