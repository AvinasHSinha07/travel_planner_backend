import { prisma } from '../../lib/prisma';

const createActivityIntoDB = async (payload: any) => {
  const result = await prisma.activity.create({
    data: payload,
  });
  return result;
};

const getDestinationActivitiesFromDB = async (destinationId: string) => {
  const result = await prisma.activity.findMany({
    where: { destinationId },
  });
  return result;
};

export const ActivityService = {
  createActivityIntoDB,
  getDestinationActivitiesFromDB,
};
