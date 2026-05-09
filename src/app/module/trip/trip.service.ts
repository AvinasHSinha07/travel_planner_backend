import { ItineraryItem, Role } from '@prisma/client';
import httpStatus from 'http-status';
import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import AppError from '../../errorHelpers/AppError';

const createTripIntoDB = async (userId: string, payload: any) => {
  const result = await prisma.trip.create({
    data: {
      ...payload,
      userId,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
    },
  });
  return result;
};

const getMyTripsFromDB = async (userId: string) => {
  const result = await prisma.trip.findMany({
    where: { userId },
    include: {
      destination: true,
      itineraryItems: {
        orderBy: [{ day: 'asc' }, { order: 'asc' }],
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return result;
};

const getSingleTripFromDB = async (id: string, userId: string) => {
  const result = await prisma.trip.findFirst({
    where: { id, userId },
    include: {
      destination: true,
      itineraryItems: {
        orderBy: [{ day: 'asc' }, { order: 'asc' }],
      },
      bookings: true,
    },
  });
  return result;
};

const updateTripInDB = async (id: string, userId: string, payload: any) => {
  const data: any = { ...payload };
  if (payload.startDate) data.startDate = new Date(payload.startDate);
  if (payload.endDate) data.endDate = new Date(payload.endDate);

  const result = await prisma.trip.update({
    where: { id, userId },
    data,
  });
  await cache.invalidateTripItineraryAi(id);
  return result;
};

const deleteTripFromDB = async (id: string, userId: string, role: Role) => {
  if (role === Role.ADMIN) {
    const result = await prisma.trip.delete({
      where: { id },
    });
    return result;
  }

  const result = await prisma.trip.delete({
    where: { id, userId },
  });
  return result;
};

const assertTripWriteAccess = async (tripId: string, userId: string, role: Role) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, userId: true },
  });
  if (!trip) {
    throw new AppError(httpStatus.NOT_FOUND, 'Trip not found');
  }
  if (role !== Role.ADMIN && trip.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not have access to this trip');
  }
  return trip;
};

const assertItineraryItemAccess = async (itemId: string, userId: string, role: Role) => {
  const item = await prisma.itineraryItem.findUnique({
    where: { id: itemId },
    include: { trip: { select: { userId: true, id: true } } },
  });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, 'Itinerary item not found');
  }
  if (role !== Role.ADMIN && item.trip.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not have access to this itinerary item');
  }
  return item;
};

const addItineraryItemToDB = async (tripId: string, userId: string, role: Role, payload: any) => {
  await assertTripWriteAccess(tripId, userId, role);
  const result = await prisma.itineraryItem.create({
    data: {
      ...payload,
      tripId,
    },
  });
  await cache.invalidateTripItineraryAi(tripId);
  return result;
};

const updateItineraryItemInDB = async (
  itemId: string,
  userId: string,
  role: Role,
  payload: Partial<ItineraryItem>,
) => {
  const item = await assertItineraryItemAccess(itemId, userId, role);
  const result = await prisma.itineraryItem.update({
    where: { id: itemId },
    data: payload,
  });
  await cache.invalidateTripItineraryAi(item.trip.id);
  return result;
};

const removeItineraryItemFromDB = async (itemId: string, userId: string, role: Role) => {
  const item = await assertItineraryItemAccess(itemId, userId, role);
  const result = await prisma.itineraryItem.delete({
    where: { id: itemId },
  });
  await cache.invalidateTripItineraryAi(item.trip.id);
  return result;
};

export const TripService = {
  createTripIntoDB,
  getMyTripsFromDB,
  getSingleTripFromDB,
  updateTripInDB,
  deleteTripFromDB,
  addItineraryItemToDB,
  updateItineraryItemInDB,
  removeItineraryItemFromDB,
};
