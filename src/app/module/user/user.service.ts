import { prisma } from '../../lib/prisma';
import { Prisma, Role } from '@prisma/client';

const getAllUsersForAdminFromDB = async (opts: {
  search?: string;
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'name' | 'email' | 'role';
  sortOrder: 'asc' | 'desc';
  suspended: 'all' | 'true' | 'false';
}) => {
  const take = Math.min(Math.max(opts.limit, 1), 100);
  const skip = (Math.max(opts.page, 1) - 1) * take;
  const term = opts.search?.trim();

  const where: Prisma.UserWhereInput = {};
  if (term) {
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ];
  }
  if (opts.suspended === 'true') where.isSuspended = true;
  if (opts.suspended === 'false') where.isSuspended = false;

  const orderBy: Prisma.UserOrderByWithRelationInput = {
    [opts.sortBy]: opts.sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        isSuspended: true,
        createdAt: true,
        _count: {
          select: { trips: true, bookings: true },
        },
      },
      orderBy,
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    meta: {
      total,
      page: opts.page,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
};

const updateUserRoleInDB = async (userId: string, role: Role) => {
  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      isSuspended: true,
      createdAt: true,
    },
  });
};

const updateUserSuspensionInDB = async (userId: string, isSuspended: boolean) => {
  return prisma.user.update({
    where: { id: userId },
    data: { isSuspended },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isSuspended: true,
    },
  });
};

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
  getAllUsersForAdminFromDB,
  updateUserRoleInDB,
  updateUserSuspensionInDB,
  getMyProfileFromDB,
  updateMyProfileInDB,
  getDashboardStatsFromDB,
};
