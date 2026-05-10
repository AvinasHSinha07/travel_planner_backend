import { Destination, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const createDestinationIntoDB = async (payload: Destination, creatorId?: string) => {
  const result = await prisma.destination.create({
    data: { ...payload, creatorId },
  });
  return result;
};

const getAllDestinationsFromDB = async (query: any, user?: any) => {
  const { searchTerm, category, country, minPrice, maxPrice, sortBy, sortOrder, page = 1, limit = 12, isManagement } = query;

  const whereConditions: Prisma.DestinationWhereInput = {};

  if (user?.role === 'TRAVEL_AGENT' && isManagement === 'true') {
    whereConditions.creatorId = user.id;
  }

  if (searchTerm) {
    whereConditions.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { country: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (category) whereConditions.category = category;
  if (country) whereConditions.country = country;
  
  if (minPrice || maxPrice) {
    whereConditions.avgCostPerDay = {
      gte: minPrice ? parseFloat(minPrice) : undefined,
      lte: maxPrice ? parseFloat(maxPrice) : undefined,
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const result = await prisma.destination.findMany({
    where: whereConditions,
    orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
    skip,
    take,
    include: {
      activities: true,
      accommodations: true,
    },
  });

  const total = await prisma.destination.count({ where: whereConditions });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
    data: result,
  };
};

const getSingleDestinationFromDB = async (id: string) => {
  const result = await prisma.destination.findUnique({
    where: { id },
    include: {
      activities: true,
      accommodations: true,
      reviews: {
        include: {
          user: {
            select: { name: true, avatar: true },
          },
        },
      },
    },
  });
  return result;
};

const updateDestinationInDB = async (id: string, payload: Partial<Destination>, user?: any) => {
  if (user?.role === 'TRAVEL_AGENT') {
    const dest = await prisma.destination.findUnique({ where: { id } });
    if (!dest || dest.creatorId !== user.id) {
      throw new Error('Unauthorized or Destination not found');
    }
  }

  const result = await prisma.destination.update({
    where: { id },
    data: payload,
  });
  return result;
};

const deleteDestinationFromDB = async (id: string, user?: any) => {
  if (user?.role === 'TRAVEL_AGENT') {
    const dest = await prisma.destination.findUnique({ where: { id } });
    if (!dest || dest.creatorId !== user.id) {
      throw new Error('Unauthorized or Destination not found');
    }
  }

  const result = await prisma.destination.delete({
    where: { id },
  });
  return result;
};

export const DestinationService = {
  createDestinationIntoDB,
  getAllDestinationsFromDB,
  getSingleDestinationFromDB,
  updateDestinationInDB,
  deleteDestinationFromDB,
};
