import express from 'express';
import multer from 'multer';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import { UploadController } from './upload.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const router = express.Router();

router.post(
  '/image',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  upload.single('image'),
  UploadController.uploadImage,
);

export const UploadRoutes = router;
