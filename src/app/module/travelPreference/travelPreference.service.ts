import { prisma } from '../../lib/prisma';

const updateMyPreferencesInDB = async (userId: string, payload: any) => {
  const result = await prisma.travelPreference.upsert({
    where: { userId },
    update: payload,
    create: {
      ...payload,
      userId,
    },
  });
  return result;
};

const getMyPreferencesFromDB = async (userId: string) => {
  const result = await prisma.travelPreference.findUnique({
    where: { userId },
  });
  return result;
};

export const TravelPreferenceService = {
  updateMyPreferencesInDB,
  getMyPreferencesFromDB,
};
