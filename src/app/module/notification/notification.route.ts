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
  '/read-all',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  NotificationController.markAllAsRead,
);

router.patch(
  '/:id/read',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  NotificationController.markAsRead,
);

router.delete(
  '/:id',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  NotificationController.deleteNotification,
);

export const NotificationRoutes = router;
