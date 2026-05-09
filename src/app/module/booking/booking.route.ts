import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { BookingController } from './booking.controller';
import { BookingValidation } from './booking.validation';

const router = express.Router();

router.post(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(BookingValidation.createBookingSchema),
  BookingController.createBooking,
);

router.get(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  BookingController.getMyBookings,
);

router.post('/webhook', express.raw({type: 'application/json'}), BookingController.webhook);

export const BookingRoutes = router;
