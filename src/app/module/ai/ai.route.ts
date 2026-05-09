import express from 'express';
import { Role } from '@prisma/client';
import requireAuth from '../../middleware/auth';
import { AIController } from './ai.controller';

const router = express.Router();

// Feature 1: AI Trip Itinerary Generator
// POST /api/v1/ai/itinerary/:tripId
router.post(
  '/itinerary/:tripId',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  AIController.generateTripItinerary,
);

// Feature 2: AI Smart Destination Recommendations
// POST /api/v1/ai/recommendations
router.post(
  '/recommendations',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  AIController.getRecommendations,
);

// Feature 3: AI Travel Chat Assistant (Public - no auth required, but auth-aware)
// POST /api/v1/ai/chat
router.post(
  '/chat',
  AIController.chat,
);

// Feature 4: AI Travel Data Analyzer (Admin & Travel Agent only)
// POST /api/v1/ai/analyze
router.post(
  '/analyze',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  AIController.analyzeData,
);

// Feature 5: AI Auto Categorization / Tagging (Admin & Travel Agent only)
// POST /api/v1/ai/categorize
router.post(
  '/categorize',
  requireAuth(Role.ADMIN, Role.TRAVEL_AGENT),
  AIController.categorize,
);

// Feature 6: AI Image Captioning
// POST /api/v1/ai/caption
router.post(
  '/caption',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  AIController.captionImage,
);

// Legacy route for backward compatibility
router.post(
  '/generate/:tripId',
  requireAuth(Role.USER, Role.ADMIN, Role.TRAVEL_AGENT),
  AIController.generateTripItinerary,
);

export const AIRoutes = router;
