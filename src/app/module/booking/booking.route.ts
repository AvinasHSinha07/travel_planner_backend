import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { bookingCreateLimiter } from '../../middleware/rateLimiters';
import { BookingController } from './booking.controller';
import { BookingValidation } from './booking.validation';

const router = express.Router();

router.post(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  bookingCreateLimiter,
  validateRequest(BookingValidation.createBookingSchema),
  BookingController.createBooking,
);

router.patch(
  '/:id/status',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(BookingValidation.updateBookingStatusSchema),
  BookingController.updateBookingStatus,
);

router.get(
  '/verify',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(BookingValidation.verifyCheckoutSessionSchema),
  BookingController.verifyCheckout,
);

router.get(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(BookingValidation.listBookingsQuerySchema),
  BookingController.listBookings,
);

export const BookingRoutes = router;
