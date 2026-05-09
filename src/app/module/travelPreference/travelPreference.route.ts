import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { TravelPreferenceController } from './travelPreference.controller';
import { TravelPreferenceValidation } from './travelPreference.validation';

const router = express.Router();

router.get(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  TravelPreferenceController.getMyPreferences,
);

router.patch(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(TravelPreferenceValidation.updatePreferenceSchema),
  TravelPreferenceController.updateMyPreferences,
);

export const TravelPreferenceRoutes = router;
