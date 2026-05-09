import { z } from 'zod';

const createAccommodationSchema = z.object({
  body: z.object({
    destinationId: z.string({ message: 'Destination ID is required' }),
    name: z.string({ message: 'Name is required' }),
    type: z.enum(['HOTEL', 'RESORT', 'HOSTEL', 'AIRBNB', 'VILLA']),
    pricePerNight: z.number({ message: 'Price per night is required' }),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    location: z.string().optional(),
  }),
});

export const AccommodationValidation = {
  createAccommodationSchema,
};
