import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const createActivityIntoDB = async (payload: Prisma.ActivityUncheckedCreateInput, creatorId?: string) => {
  return prisma.activity.create({
    data: { ...payload, creatorId },
  });
};

const listActivitiesFromDB = async (q: {
  destinationId?: string;
  page: number;
  limit: number;
  sortBy: 'name' | 'price' | 'createdAt' | 'rating' | 'type';
  sortOrder: 'asc' | 'desc';
  search?: string;
  isManagement?: string;
}, user?: any) => {
  const take = Math.min(Math.max(q.limit, 1), 100);
  const skip = (Math.max(q.page, 1) - 1) * take;

  const where: Prisma.ActivityWhereInput = {};
  
  if (user?.role === 'TRAVEL_AGENT' && q.isManagement === 'true') {
    where.creatorId = user.id;
  }
  if (q.destinationId) where.destinationId = q.destinationId;
  if (q.search?.trim()) {
    where.OR = [
      { name: { contains: q.search.trim(), mode: 'insensitive' } },
      { description: { contains: q.search.trim(), mode: 'insensitive' } },
      { type: { contains: q.search.trim(), mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.ActivityOrderByWithRelationInput = {
    [q.sortBy]: q.sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        destination: { select: { id: true, name: true, country: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    items,
    meta: {
      total,
      page: q.page,
      limit: take,
      totalPage: Math.ceil(total / take) || 1,
    },
  };
};

const getDestinationActivitiesFromDB = async (destinationId: string) => {
  return prisma.activity.findMany({
    where: { destinationId },
    orderBy: { name: 'asc' },
  });
};

const updateActivityInDB = async (id: string, payload: Prisma.ActivityUpdateInput, user?: any) => {
  if (user?.role === 'TRAVEL_AGENT') {
    const act = await prisma.activity.findUnique({ where: { id } });
    if (!act || act.creatorId !== user.id) {
      throw new Error('Unauthorized or Activity not found');
    }
  }

  return prisma.activity.update({
    where: { id },
    data: payload,
    include: {
      destination: { select: { id: true, name: true, country: true } },
    },
  });
};

const deleteActivityFromDB = async (id: string, user?: any) => {
  if (user?.role === 'TRAVEL_AGENT') {
    const act = await prisma.activity.findUnique({ where: { id } });
    if (!act || act.creatorId !== user.id) {
      throw new Error('Unauthorized or Activity not found');
    }
  }
  return prisma.activity.delete({ where: { id } });
};

export const ActivityService = {
  createActivityIntoDB,
  listActivitiesFromDB,
  getDestinationActivitiesFromDB,
  updateActivityInDB,
  deleteActivityFromDB,
};
