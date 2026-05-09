import { prisma } from '../../lib/prisma';

const getMyProfileFromDB = async (userId: string) => {
  const result = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
    },
  });
  return result;
};

const updateMyProfileInDB = async (userId: string, payload: any) => {
  const result = await prisma.user.update({
    where: { id: userId },
    data: payload,
  });
  return result;
};

export const UserService = {
  getMyProfileFromDB,
  updateMyProfileInDB,
};
