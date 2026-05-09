import { z } from 'zod';

const createTripSchema = z.object({
  body: z.object({
    destinationId: z.string().uuid({ message: 'Destination ID must be a valid UUID' }),
    title: z.string({ message: 'Title is required' }),
    startDate: z.string({ message: 'Start date is required' }),
    endDate: z.string({ message: 'End date is required' }),
    totalBudget: z.number().default(0),
    travelerCount: z.number().default(1),
  }),
});

const updateTripSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['DRAFT', 'PLANNED', 'BOOKED', 'COMPLETED', 'CANCELLED']).optional(),
    totalBudget: z.number().optional(),
    travelerCount: z.number().optional(),
    galleryImages: z.array(z.string()).optional(),
  }),
});

const addItineraryItemSchema = z.object({
  body: z.object({
    day: z.number(),
    timeSlot: z.enum(['morning', 'afternoon', 'evening', 'night']),
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    type: z.enum(['SIGHTSEEING', 'DINING', 'TRANSPORT', 'ACTIVITY', 'REST', 'ACCOMMODATION']),
    estimatedCost: z.number().optional(),
    notes: z.string().optional(),
    order: z.number().optional(),
  }),
});

export const TripValidation = {
  createTripSchema,
  updateTripSchema,
  addItineraryItemSchema,
};
