import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TripService } from './trip.service';

const createTrip = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await TripService.createTripIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Trip created successfully',
    data: result,
  });
});

const getMyTrips = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await TripService.getMyTripsFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Trips retrieved successfully',
    data: result,
  });
});

const getSingleTrip = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const role = req.user?.role as Role;
  const { id } = req.params;
  const result = await TripService.getSingleTripFromDB(id as string, userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Trip retrieved successfully',
    data: result,
  });
});

const updateTrip = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const role = req.user?.role as Role;
  const { id } = req.params;
  const result = await TripService.updateTripInDB(id as string, userId, role, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Trip updated successfully',
    data: result,
  });
});

const deleteTrip = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const role = req.user?.role as Role;
  const { id } = req.params;
  const result = await TripService.deleteTripFromDB(id as string, userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Trip deleted successfully',
    data: result,
  });
});

const addItineraryItem = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const role = req.user?.role as Role;
  const { tripId } = req.params;
  const result = await TripService.addItineraryItemToDB(tripId as string, userId, role, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Itinerary item added successfully',
    data: result,
  });
});

const updateItineraryItem = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const role = req.user?.role as Role;
  const { itemId } = req.params;
  const result = await TripService.updateItineraryItemInDB(itemId as string, userId, role, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Itinerary item updated successfully',
    data: result,
  });
});

const removeItineraryItem = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const role = req.user?.role as Role;
  const { itemId } = req.params;
  const result = await TripService.removeItineraryItemFromDB(itemId as string, userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Itinerary item removed successfully',
    data: result,
  });
});

export const TripController = {
  createTrip,
  getMyTrips,
  getSingleTrip,
  updateTrip,
  deleteTrip,
  addItineraryItem,
  updateItineraryItem,
  removeItineraryItem,
};
