import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import { UserController } from './user.controller';

const router = express.Router();

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

export const UserRoutes = router;
