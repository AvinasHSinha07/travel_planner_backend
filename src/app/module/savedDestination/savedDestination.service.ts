import httpStatus from 'http-status';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';

const assertDestinationExists = async (destinationId: string) => {
  const dest = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { id: true },
  });
  if (!dest) {
    throw new AppError(httpStatus.NOT_FOUND, 'Destination not found');
  }
};

const saveDestinationForUser = async (userId: string, destinationId: string) => {
  await assertDestinationExists(destinationId);

  const existing = await prisma.savedDestination.findUnique({
    where: {
      userId_destinationId: { userId, destinationId },
    },
  });
  if (existing) {
    return existing;
  }

  return prisma.savedDestination.create({
    data: { userId, destinationId },
  });
};

const removeSavedDestinationForUser = async (userId: string, destinationId: string) => {
  /** Idempotent: client optimistic state can get out of sync; treat missing row as already removed. */
  await prisma.savedDestination.deleteMany({
    where: { userId, destinationId },
  });
};

const listSavedDestinationIdsForUser = async (userId: string) => {
  const rows = await prisma.savedDestination.findMany({
    where: { userId },
    select: { destinationId: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => r.destinationId);
};

const listSavedDestinationsForUser = async (userId: string) => {
  const rows = await prisma.savedDestination.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      destination: {
        include: {
          activities: true,
          accommodations: true,
        },
      },
    },
  });
  return rows.map((r) => r.destination);
};

export const SavedDestinationService = {
  saveDestinationForUser,
  removeSavedDestinationForUser,
  listSavedDestinationIdsForUser,
  listSavedDestinationsForUser,
};
