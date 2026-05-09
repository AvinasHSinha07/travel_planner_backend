import { Destination, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const createDestinationIntoDB = async (payload: Destination) => {
  const result = await prisma.destination.create({
    data: payload,
  });
  return result;
};

const getAllDestinationsFromDB = async (query: any) => {
  const { searchTerm, category, country, minPrice, maxPrice, sortBy, sortOrder } = query;

  const whereConditions: Prisma.DestinationWhereInput = {};

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

  const result = await prisma.destination.findMany({
    where: whereConditions,
    orderBy: sortBy ? { [sortBy]: sortOrder || 'desc' } : { createdAt: 'desc' },
    include: {
      activities: true,
      accommodations: true,
    },
  });

  return result;
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

const updateDestinationInDB = async (id: string, payload: Partial<Destination>) => {
  const result = await prisma.destination.update({
    where: { id },
    data: payload,
  });
  return result;
};

const deleteDestinationFromDB = async (id: string) => {
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
