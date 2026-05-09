import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { AccommodationController } from './accommodation.controller';
import { AccommodationValidation } from './accommodation.validation';

const router = express.Router();

router.get(
  '/',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(AccommodationValidation.listAccommodationsQuerySchema),
  AccommodationController.listAccommodations,
);

router.post(
  '/',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(AccommodationValidation.createAccommodationSchema),
  AccommodationController.createAccommodation,
);

router.get(
  '/by-destination/:destinationId',
  validateRequest(AccommodationValidation.byDestinationParamsSchema),
  AccommodationController.getDestinationAccommodations,
);

router.patch(
  '/:id',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(AccommodationValidation.updateAccommodationSchema),
  AccommodationController.updateAccommodation,
);

router.delete(
  '/:id',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(AccommodationValidation.deleteAccommodationSchema),
  AccommodationController.deleteAccommodation,
);

export const AccommodationRoutes = router;
