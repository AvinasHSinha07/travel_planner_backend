import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { AccommodationController } from './accommodation.controller';
import { AccommodationValidation } from './accommodation.validation';

const router = express.Router();

router.post(
  '/',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(AccommodationValidation.createAccommodationSchema),
  AccommodationController.createAccommodation,
);

router.get('/:destinationId', AccommodationController.getDestinationAccommodations);

export const AccommodationRoutes = router;
