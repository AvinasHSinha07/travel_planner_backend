import { z } from 'zod';

const createBookingSchema = z.object({
  body: z.object({
    tripId: z.string().optional(),
    type: z.enum(['FLIGHT', 'HOTEL', 'ACTIVITY', 'PACKAGE']),
    totalAmount: z.number().positive(),
  }),
});

export const BookingValidation = {
  createBookingSchema,
};
