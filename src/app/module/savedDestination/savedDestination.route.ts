import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { SavedDestinationController } from './savedDestination.controller';
import { SavedDestinationValidation } from './savedDestination.validation';

const router = express.Router();

router.get(
  '/ids',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  SavedDestinationController.listSavedDestinationIds,
);

router.get(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  SavedDestinationController.listSavedDestinations,
);

router.post(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(SavedDestinationValidation.saveDestinationSchema),
  SavedDestinationController.saveDestination,
);

router.delete(
  '/:destinationId',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(SavedDestinationValidation.deleteSavedDestinationSchema),
  SavedDestinationController.removeSavedDestination,
);

export const SavedDestinationRoutes = router;
