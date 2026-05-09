import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AccommodationService } from './accommodation.service';

const createAccommodation = catchAsync(async (req, res) => {
  const result = await AccommodationService.createAccommodationIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Accommodation created successfully',
    data: result,
  });
});

const getDestinationAccommodations = catchAsync(async (req, res) => {
  const { destinationId } = req.params;
  const result = await AccommodationService.getDestinationAccommodationsFromDB(destinationId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Accommodations retrieved successfully',
    data: result,
  });
});

export const AccommodationController = {
  createAccommodation,
  getDestinationAccommodations,
};
