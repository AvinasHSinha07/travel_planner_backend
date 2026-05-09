import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import { AnalyticsController } from './analytics.controller';

const router = express.Router();

router.get(
  '/dashboard',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  AnalyticsController.getDashboard,
);

export const AnalyticsRoutes = router;
