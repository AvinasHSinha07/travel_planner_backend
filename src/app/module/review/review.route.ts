import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { ReviewController } from './review.controller';
import { ReviewValidation } from './review.validation';

const router = express.Router();

router.post(
  '/',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(ReviewValidation.createReviewSchema),
  ReviewController.createReview,
);

router.get(
  '/admin/all',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(ReviewValidation.adminListReviewsSchema),
  ReviewController.adminListReviews,
);

router.delete(
  '/:reviewId',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  validateRequest(ReviewValidation.deleteReviewSchema),
  ReviewController.deleteReview,
);

router.get(
  '/:destinationId',
  validateRequest(ReviewValidation.listDestinationReviewsSchema),
  ReviewController.getDestinationReviews,
);

export const ReviewRoutes = router;
