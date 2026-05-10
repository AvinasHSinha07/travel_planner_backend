import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReviewService } from './review.service';

const createReview = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await ReviewService.createReviewIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review saved successfully',
    data: result,
  });
});

const getDestinationReviews = catchAsync(async (req, res) => {
  const { destinationId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await ReviewService.getDestinationReviewsFromDB(destinationId as string, page, limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    meta: result.meta,
    data: result.items,
  });
});

const adminListReviews = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 25;
  const destinationId = req.query.destinationId as string | undefined;
  const search = req.query.search as string | undefined;

  const result = await ReviewService.listAllReviewsForAdminFromDB({
    page,
    limit,
    destinationId,
    search,
  }, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    meta: result.meta,
    data: result.items,
  });
});

const deleteReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  const result = await ReviewService.deleteReviewByIdFromDB(reviewId as string, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review deleted',
    data: result,
  });
});

export const ReviewController = {
  createReview,
  adminListReviews,
  getDestinationReviews,
  deleteReview,
};
