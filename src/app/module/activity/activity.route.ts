import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { ActivityController } from './activity.controller';
import { ActivityValidation } from './activity.validation';

const router = express.Router();

router.post(
  '/',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(ActivityValidation.createActivitySchema),
  ActivityController.createActivity,
);

router.get('/:destinationId', ActivityController.getDestinationActivities);

export const ActivityRoutes = router;
