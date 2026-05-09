import { Trip, ItineraryItem, TripStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

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
        orderBy: [
          { day: 'asc' },
          { order: 'asc' },
        ],
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
        orderBy: [
          { day: 'asc' },
          { order: 'asc' },
        ],
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
  return result;
};

const deleteTripFromDB = async (id: string, userId: string) => {
  const result = await prisma.trip.delete({
    where: { id, userId },
  });
  return result;
};

// --- Itinerary Item Operations ---

const addItineraryItemToDB = async (tripId: string, payload: any) => {
  const result = await prisma.itineraryItem.create({
    data: {
      ...payload,
      tripId,
    },
  });
  return result;
};

const updateItineraryItemInDB = async (itemId: string, payload: any) => {
  const result = await prisma.itineraryItem.update({
    where: { id: itemId },
    data: payload,
  });
  return result;
};

const removeItineraryItemFromDB = async (itemId: string) => {
  const result = await prisma.itineraryItem.delete({
    where: { id: itemId },
  });
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
