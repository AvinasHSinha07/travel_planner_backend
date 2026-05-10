import { AccommodationType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const createAccommodationIntoDB = async (payload: Prisma.AccommodationUncheckedCreateInput, creatorId?: string) => {
  return prisma.accommodation.create({ data: { ...payload, creatorId } });
};

const listAccommodationsFromDB = async (q: {
  destinationId?: string;
  page: number;
  limit: number;
  sortBy: 'name' | 'pricePerNight' | 'createdAt' | 'rating' | 'type';
  sortOrder: 'asc' | 'desc';
  search?: string;
  type?: AccommodationType;
}, user?: any) => {
  const take = Math.min(Math.max(q.limit, 1), 100);
  const skip = (Math.max(q.page, 1) - 1) * take;

  const where: Prisma.AccommodationWhereInput = {};
  
  if (user?.role === 'TRAVEL_AGENT' && q.isManagement === 'true') {
    where.creatorId = user.id;
  }
  if (q.destinationId) where.destinationId = q.destinationId;
  if (q.type) where.type = q.type;
  if (q.search?.trim()) {
    where.OR = [
      { name: { contains: q.search.trim(), mode: 'insensitive' } },
      { location: { contains: q.search.trim(), mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.AccommodationOrderByWithRelationInput = {
    [q.sortBy]: q.sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.accommodation.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        destination: { select: { id: true, name: true, country: true } },
      },
    }),
    prisma.accommodation.count({ where }),
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

const getDestinationAccommodationsFromDB = async (destinationId: string) => {
  return prisma.accommodation.findMany({
    where: { destinationId },
    orderBy: { name: 'asc' },
  });
};

const updateAccommodationInDB = async (id: string, payload: Prisma.AccommodationUpdateInput, user?: any) => {
  if (user?.role === 'TRAVEL_AGENT') {
    const acc = await prisma.accommodation.findUnique({ where: { id } });
    if (!acc || acc.creatorId !== user.id) {
      throw new Error('Unauthorized or Accommodation not found');
    }
  }

  return prisma.accommodation.update({
    where: { id },
    data: payload,
    include: {
      destination: { select: { id: true, name: true, country: true } },
    },
  });
};

const deleteAccommodationFromDB = async (id: string, user?: any) => {
  if (user?.role === 'TRAVEL_AGENT') {
    const acc = await prisma.accommodation.findUnique({ where: { id } });
    if (!acc || acc.creatorId !== user.id) {
      throw new Error('Unauthorized or Accommodation not found');
    }
  }
  return prisma.accommodation.delete({ where: { id } });
};

export const AccommodationService = {
  createAccommodationIntoDB,
  listAccommodationsFromDB,
  getDestinationAccommodationsFromDB,
  updateAccommodationInDB,
  deleteAccommodationFromDB,
};
