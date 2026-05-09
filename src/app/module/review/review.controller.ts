import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReviewService } from './review.service';

const createReview = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await ReviewService.createReviewIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Review created successfully',
    data: result,
  });
});

const getDestinationReviews = catchAsync(async (req, res) => {
  const { destinationId } = req.params;
  const result = await ReviewService.getDestinationReviewsFromDB(destinationId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getDestinationReviews,
};
