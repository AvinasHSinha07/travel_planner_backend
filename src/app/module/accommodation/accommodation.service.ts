import { prisma } from '../../lib/prisma';

const createAccommodationIntoDB = async (payload: any) => {
  const result = await prisma.accommodation.create({
    data: payload,
  });
  return result;
};

const getDestinationAccommodationsFromDB = async (destinationId: string) => {
  const result = await prisma.accommodation.findMany({
    where: { destinationId },
  });
  return result;
};

export const AccommodationService = {
  createAccommodationIntoDB,
  getDestinationAccommodationsFromDB,
};
