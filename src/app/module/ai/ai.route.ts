import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import { AIController } from './ai.controller';

const router = express.Router();

router.post(
  '/generate/:tripId',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  AIController.generateTripItinerary,
);

export const AIRoutes = router;
