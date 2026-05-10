import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { TripController } from './trip.controller';
import { TripValidation } from './trip.validation';

const router = express.Router();

router.post(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(TripValidation.createTripSchema),
  TripController.createTrip,
);

router.get(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  TripController.getMyTrips,
);

router.get(
  '/:id',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  TripController.getSingleTrip,
);

router.patch(
  '/:id',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(TripValidation.updateTripSchema),
  TripController.updateTrip,
);

router.delete(
  '/:id',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  TripController.deleteTrip,
);

// Itinerary Items
router.post(
  '/:tripId/itinerary',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(TripValidation.addItineraryItemSchema),
  TripController.addItineraryItem,
);

router.patch(
  '/itinerary/:itemId',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  TripController.updateItineraryItem,
);

router.delete(
  '/itinerary/:itemId',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  TripController.removeItineraryItem,
);

export const TripRoutes = router;
