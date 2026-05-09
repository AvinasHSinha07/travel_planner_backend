import { BookingStatus, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';

type MonthlyRow = { month: string; bookings: number; revenue: number; newUsers: number };

const monthKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const lastNMonthStarts = (n: number): Date[] => {
  const out: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d);
  }
  return out;
};

const getPlatformAnalytics = async () => {
  const [
    totalUsers,
    totalDestinations,
    totalBookings,
    totalTrips,
    totalReviews,
    totalActivities,
    totalAccommodations,
    revenueAgg,
    bookingsByType,
    latestDaily,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.destination.count(),
    prisma.booking.count(),
    prisma.trip.count(),
    prisma.review.count(),
    prisma.activity.count(),
    prisma.accommodation.count(),
    prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { status: BookingStatus.CONFIRMED },
    }),
    prisma.booking.groupBy({
      by: ['type'],
      _count: { _all: true },
    }),
    prisma.analyticsDailyStats.findFirst({
      orderBy: { date: 'desc' },
    }),
  ]);

  const start = lastNMonthStarts(6)[0];

  const [bookingMonths, userMonths] = await Promise.all([
    prisma.$queryRaw<
      { m: Date; bookings: bigint; revenue: number | null }[]
    >`
      SELECT date_trunc('month', "createdAt") AS m,
             COUNT(*)::bigint AS bookings,
             COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN "totalAmount" ELSE 0 END), 0)::float AS revenue
      FROM "booking"
      WHERE "createdAt" >= ${start}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<{ m: Date; new_users: bigint }[]>`
      SELECT date_trunc('month', "createdAt") AS m,
             COUNT(*)::bigint AS new_users
      FROM "user"
      WHERE "createdAt" >= ${start}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  const bookMap = new Map<string, { bookings: number; revenue: number }>();
  for (const row of bookingMonths) {
    const k = monthKey(new Date(row.m));
    bookMap.set(k, {
      bookings: Number(row.bookings),
      revenue: Number(row.revenue ?? 0),
    });
  }
  const userMap = new Map<string, number>();
  for (const row of userMonths) {
    userMap.set(monthKey(new Date(row.m)), Number(row.new_users));
  }

  const monthlySeries: MonthlyRow[] = lastNMonthStarts(6).map((d) => {
    const k = monthKey(d);
    const b = bookMap.get(k);
    return {
      month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      bookings: b?.bookings ?? 0,
      revenue: b?.revenue ?? 0,
      newUsers: userMap.get(k) ?? 0,
    };
  });

  return {
    summary: {
      totalUsers,
      totalDestinations,
      totalBookings,
      totalTrips,
      totalReviews,
      totalActivities,
      totalAccommodations,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
    },
    bookingsByType: bookingsByType.map((row) => ({
      type: row.type,
      count: row._count._all,
    })),
    monthlySeries,
    latestDailyStats: latestDaily,
  };
};

const getUserAnalytics = async (userId: string) => {
  const [totalTrips, totalBookings, totalNotifications, spentAgg] = await Promise.all([
    prisma.trip.count({ where: { userId } }),
    prisma.booking.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { userId, status: BookingStatus.CONFIRMED },
    }),
  ]);

  const start = lastNMonthStarts(6)[0];
  const [personalBookings, tripMonths] = await Promise.all([
    prisma.$queryRaw<{ m: Date; bookings: bigint; revenue: number | null }[]>`
      SELECT date_trunc('month', "createdAt") AS m,
             COUNT(*)::bigint AS bookings,
             COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN "totalAmount" ELSE 0 END), 0)::float AS revenue
      FROM "booking"
      WHERE "userId" = ${userId} AND "createdAt" >= ${start}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<{ m: Date; trips: bigint }[]>`
      SELECT date_trunc('month', "startDate") AS m,
             COUNT(*)::bigint AS trips
      FROM "trip"
      WHERE "userId" = ${userId} AND "startDate" >= ${start}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  const pbMap = new Map<string, { bookings: number; revenue: number }>();
  for (const row of personalBookings) {
    const k = monthKey(new Date(row.m));
    pbMap.set(k, { bookings: Number(row.bookings), revenue: Number(row.revenue ?? 0) });
  }
  const tripMap = new Map<string, number>();
  for (const row of tripMonths) {
    tripMap.set(monthKey(new Date(row.m)), Number(row.trips));
  }

  const monthlySeries = lastNMonthStarts(6).map((d) => {
    const k = monthKey(d);
    const b = pbMap.get(k);
    return {
      month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      bookings: b?.bookings ?? 0,
      revenue: b?.revenue ?? 0,
      trips: tripMap.get(k) ?? 0,
    };
  });

  return {
    summary: {
      totalTrips,
      totalBookings,
      totalNotifications,
      totalSpent: spentAgg._sum.totalAmount ?? 0,
    },
    monthlySeries,
  };
};

export const getDashboardAnalytics = async (userId: string, role: Role) => {
  if (role === Role.ADMIN || role === Role.TRAVEL_AGENT) {
    const platform = await getPlatformAnalytics();
    return { scope: 'platform' as const, ...platform };
  }
  const user = await getUserAnalytics(userId);
  return { scope: 'user' as const, ...user };
};
