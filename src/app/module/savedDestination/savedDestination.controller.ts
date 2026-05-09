import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SavedDestinationService } from './savedDestination.service';

const saveDestination = catchAsync(async (req, res) => {
  const userId = req.user!.id;
  const { destinationId } = req.body;
  const result = await SavedDestinationService.saveDestinationForUser(userId, destinationId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Destination saved',
    data: result,
  });
});

const removeSavedDestination = catchAsync(async (req, res) => {
  const userId = req.user!.id;
  const destinationId = String(req.params.destinationId);
  await SavedDestinationService.removeSavedDestinationForUser(userId, destinationId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Destination removed from saved',
    data: null,
  });
});

const listSavedDestinations = catchAsync(async (req, res) => {
  const userId = req.user!.id;
  const result = await SavedDestinationService.listSavedDestinationsForUser(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Saved destinations retrieved successfully',
    data: result,
  });
});

const listSavedDestinationIds = catchAsync(async (req, res) => {
  const userId = req.user!.id;
  const result = await SavedDestinationService.listSavedDestinationIdsForUser(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Saved destination ids retrieved successfully',
    data: result,
  });
});

export const SavedDestinationController = {
  saveDestination,
  removeSavedDestination,
  listSavedDestinations,
  listSavedDestinationIds,
};
