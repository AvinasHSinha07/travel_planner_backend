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

const getDashboardStatsFromDB = async (userId: string, role: string) => {
  if (role === 'ADMIN') {
    const [totalUsers, totalDestinations, totalBookings, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.destination.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          status: 'CONFIRMED',
        },
      }),
    ]);

    return {
      totalUsers,
      totalDestinations,
      totalBookings,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
    };
  } else {
    const [totalTrips, totalBookings, totalNotifications, totalSpent] = await Promise.all([
      prisma.trip.count({ where: { userId } }),
      prisma.booking.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.booking.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          userId,
          status: 'CONFIRMED',
        },
      }),
    ]);

    return {
      totalTrips,
      totalBookings,
      totalNotifications,
      totalSpent: totalSpent._sum.totalAmount || 0,
    };
  }
};

export const UserService = {
  getMyProfileFromDB,
  updateMyProfileInDB,
  getDashboardStatsFromDB,
};
