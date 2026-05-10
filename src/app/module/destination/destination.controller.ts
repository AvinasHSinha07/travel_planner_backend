import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DestinationService } from './destination.service';

const createDestination = catchAsync(async (req, res) => {
  const result = await DestinationService.createDestinationIntoDB(req.body, req.user?.id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Destination created successfully',
    data: result,
  });
});

const getAllDestinations = catchAsync(async (req, res) => {
  const result = await DestinationService.getAllDestinationsFromDB(req.query, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Destinations retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSingleDestination = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await DestinationService.getSingleDestinationFromDB(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Destination retrieved successfully',
    data: result,
  });
});

const updateDestination = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await DestinationService.updateDestinationInDB(id as string, req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Destination updated successfully',
    data: result,
  });
});

const deleteDestination = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await DestinationService.deleteDestinationFromDB(id as string, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Destination deleted successfully',
    data: result,
  });
});

export const DestinationController = {
  createDestination,
  getAllDestinations,
  getSingleDestination,
  updateDestination,
  deleteDestination,
};
