import { z } from 'zod';

const createBookingSchema = z.object({
  body: z.object({
    tripId: z.string().uuid().optional(),
    /** When booking without a trip (e.g. destination page), stored on booking.metadata and Stripe session metadata. */
    destinationId: z.string().uuid().optional(),
    type: z.enum(['FLIGHT', 'HOTEL', 'ACTIVITY', 'PACKAGE']),
    totalAmount: z.number().positive(),
  }),
});

const updateBookingStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED']),
  }),
});

const verifyCheckoutSessionSchema = z.object({
  query: z.object({
    sessionId: z.string().min(1, 'sessionId is required'),
  }),
});

const listBookingsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED']).optional(),
    type: z.enum(['FLIGHT', 'HOTEL', 'ACTIVITY', 'PACKAGE']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const BookingValidation = {
  createBookingSchema,
  updateBookingStatusSchema,
  verifyCheckoutSessionSchema,
  listBookingsQuerySchema,
};
