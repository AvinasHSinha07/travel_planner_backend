import express from 'express';
import { Role } from '@prisma/client';
import requireAuth, { optionalAuth } from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { ActivityController } from './activity.controller';
import { ActivityValidation } from './activity.validation';

const router = express.Router();

router.get(
  '/',
  optionalAuth,
  validateRequest(ActivityValidation.listActivitiesQuerySchema),
  ActivityController.listActivities,
);

router.post(
  '/',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(ActivityValidation.createActivitySchema),
  ActivityController.createActivity,
);

router.get(
  '/by-destination/:destinationId',
  validateRequest(ActivityValidation.byDestinationParamsSchema),
  ActivityController.getDestinationActivities,
);

router.patch(
  '/:id',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(ActivityValidation.updateActivitySchema),
  ActivityController.updateActivity,
);

router.delete(
  '/:id',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(ActivityValidation.deleteActivitySchema),
  ActivityController.deleteActivity,
);

export const ActivityRoutes = router;
