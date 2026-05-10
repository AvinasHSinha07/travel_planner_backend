import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AIService } from './ai.service';

const chatStream = catchAsync(async (req, res) => {
  const { message, history } = req.body;
  await AIService.streamTravelChat(message, history || [], req.user?.id, res);
});

// Feature 1: Generate Trip Itinerary
const generateTripItinerary = catchAsync(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user!.id;
  const role = req.user!.role as Role;
  const result = await AIService.generateItinerary(tripId as string, userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Itinerary generated successfully by AI',
    data: result,
  });
});

// Feature 2: Get Smart Recommendations
const getRecommendations = catchAsync(async (req, res) => {
  const userId = req.user!.id as string;
  const result = await AIService.getRecommendations(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AI recommendations retrieved successfully',
    data: result,
  });
});

// Feature 3: AI Chat Assistant
const chat = catchAsync(async (req, res) => {
  const { message, history } = req.body;
  const userId = req.user?.id;
  
  const result = await AIService.chat(message, history || [], userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AI response generated',
    data: result,
  });
});

// Feature 4: Analyze Data (Admin only)
const analyzeData = catchAsync(async (req, res) => {
  const { dataset } = req.body;
  const result = await AIService.analyzeData(dataset);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Data analysis completed',
    data: result,
  });
});

// Feature 5: Auto Categorize
const categorize = catchAsync(async (req, res) => {
  const { name, description, activities } = req.body;
  const result = await AIService.categorize({ name, description, activities });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AI categorization completed',
    data: result,
  });
});

// Feature 6: Caption Image
const captionImage = catchAsync(async (req, res) => {
  const { imageUrl } = req.body;
  const result = await AIService.captionImage(imageUrl);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Image caption generated',
    data: result,
  });
});

// Feature 7: Generate Content
const generateContent = catchAsync(async (req, res) => {
  const { type, context } = req.body;
  const result = await AIService.generateContent(type, context);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AI content generated',
    data: result,
  });
});

export const AIController = {
  generateTripItinerary,
  getRecommendations,
  chat,
  chatStream,
  analyzeData,
  categorize,
  captionImage,
  generateContent,
};
