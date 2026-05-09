import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AIService } from './ai.service';

// Feature 1: Generate Trip Itinerary
const generateTripItinerary = catchAsync(async (req, res) => {
  const { tripId } = req.params;
  const result = await AIService.generateItinerary(tripId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.status === 'queued' 
      ? 'Itinerary generation queued' 
      : 'Itinerary generated successfully by AI',
    data: result,
  });
});

// Feature 2: Get Smart Recommendations
const getRecommendations = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
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

export const AIController = {
  generateTripItinerary,
  getRecommendations,
  chat,
  analyzeData,
  categorize,
  captionImage,
};
