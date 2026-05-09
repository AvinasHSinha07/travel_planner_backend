import { z } from 'zod';

const accommodationTypeEnum = z.enum(['HOTEL', 'RESORT', 'HOSTEL', 'AIRBNB', 'VILLA']);

const createAccommodationSchema = z.object({
  body: z.object({
    destinationId: z.string().uuid(),
    name: z.string().min(1),
    type: accommodationTypeEnum,
    pricePerNight: z.number(),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    location: z.string().optional(),
  }),
});

const updateAccommodationSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    destinationId: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    type: accommodationTypeEnum.optional(),
    pricePerNight: z.number().optional(),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    location: z.string().optional().nullable(),
    rating: z.number().min(0).max(5).optional(),
  }),
});

const deleteAccommodationSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const listAccommodationsQuerySchema = z.object({
  query: z.object({
    destinationId: z.string().uuid().optional(),
    type: accommodationTypeEnum.optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    sortBy: z
      .enum(['name', 'pricePerNight', 'createdAt', 'rating', 'type'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
  }),
});

const byDestinationParamsSchema = z.object({
  params: z.object({ destinationId: z.string().uuid() }),
});

export const AccommodationValidation = {
  createAccommodationSchema,
  updateAccommodationSchema,
  deleteAccommodationSchema,
  listAccommodationsQuerySchema,
  byDestinationParamsSchema,
};
