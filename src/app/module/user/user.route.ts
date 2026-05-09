import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';

const router = express.Router();

router.get(
  '/dashboard-stats',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  UserController.getDashboardStats,
);

router.get(
  '/me',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  UserController.getMyProfile,
);

router.patch(
  '/me',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  UserController.updateMyProfile,
);

router.get(
  '/',
  requireAuth(Role.ADMIN),
  validateRequest(UserValidation.listUsersQuerySchema),
  UserController.getAllUsers,
);

router.patch(
  '/:userId/role',
  requireAuth(Role.ADMIN),
  validateRequest(UserValidation.updateUserRoleSchema),
  UserController.updateUserRole,
);

router.patch(
  '/:userId/suspension',
  requireAuth(Role.ADMIN),
  validateRequest(UserValidation.updateUserSuspensionSchema),
  UserController.updateUserSuspension,
);

export const UserRoutes = router;
