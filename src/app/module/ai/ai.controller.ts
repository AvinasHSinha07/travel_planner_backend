import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AIService } from './ai.service';

const generateTripItinerary = catchAsync(async (req, res) => {
  const { tripId } = req.params;
  const result = await AIService.generateItinerary(tripId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Itinerary generated successfully by AI',
    data: result,
  });
});

export const AIController = {
  generateTripItinerary,
};
