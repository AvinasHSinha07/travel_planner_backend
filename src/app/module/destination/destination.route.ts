import express from 'express';
import { Role } from '@prisma/client';
import requireAuth, { optionalAuth } from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { DestinationController } from './destination.controller';
import { DestinationValidation } from './destination.validation';

const router = express.Router();

router.post(
  '/',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(DestinationValidation.createDestinationSchema),
  DestinationController.createDestination,
);

router.get('/', optionalAuth, DestinationController.getAllDestinations);

router.get('/:id', DestinationController.getSingleDestination);

router.patch(
  '/:id',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(DestinationValidation.updateDestinationSchema),
  DestinationController.updateDestination,
);

router.delete(
  '/:id',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  DestinationController.deleteDestination,
);

export const DestinationRoutes = router;
