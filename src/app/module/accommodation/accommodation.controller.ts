import httpStatus from 'http-status';
import { AccommodationType } from '@prisma/client';
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

const listAccommodations = catchAsync(async (req, res) => {
  const q = req.query as {
    destinationId?: string;
    type?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
  };
  const result = await AccommodationService.listAccommodationsFromDB({
    destinationId: q.destinationId,
    type: q.type as AccommodationType | undefined,
    page: q.page ? Number(q.page) : 1,
    limit: q.limit ? Number(q.limit) : 20,
    sortBy: (q.sortBy as 'name' | 'pricePerNight' | 'createdAt' | 'rating' | 'type') || 'createdAt',
    sortOrder: (q.sortOrder as 'asc' | 'desc') || 'desc',
    search: q.search,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Accommodations retrieved successfully',
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

const updateAccommodation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await AccommodationService.updateAccommodationInDB(id as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Accommodation updated successfully',
    data: result,
  });
});

const deleteAccommodation = catchAsync(async (req, res) => {
  const { id } = req.params;
  await AccommodationService.deleteAccommodationFromDB(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Accommodation deleted successfully',
    data: null,
  });
});

export const AccommodationController = {
  createAccommodation,
  listAccommodations,
  getDestinationAccommodations,
  updateAccommodation,
  deleteAccommodation,
};
