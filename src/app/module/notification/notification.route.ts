import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import { NotificationController } from './notification.controller';

const router = express.Router();

router.get(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  NotificationController.getMyNotifications,
);

router.patch(
  '/:id/read',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  NotificationController.markAsRead,
);

export const NotificationRoutes = router;
