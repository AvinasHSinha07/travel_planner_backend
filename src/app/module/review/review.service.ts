import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';

const recalcDestinationRating = async (destinationId: string) => {
  const allReviews = await prisma.review.findMany({
    where: { destinationId },
    select: { rating: true },
  });
  const avgRating =
    allReviews.length === 0
      ? 0
      : allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length;

  await prisma.destination.update({
    where: { id: destinationId },
    data: { rating: avgRating },
  });
};

const createReviewIntoDB = async (
  userId: string,
  payload: {
    destinationId: string;
    rating: number;
    comment: string;
    images?: string[];
  },
) => {
  const { destinationId, rating, comment, images = [] } = payload;

  const dest = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { id: true },
  });
  if (!dest) {
    throw new AppError(httpStatus.NOT_FOUND, 'Destination not found');
  }

  const result = await prisma.review.upsert({
    where: {
      userId_destinationId: { userId, destinationId },
    },
    create: {
      userId,
      destinationId,
      rating,
      comment,
      images,
    },
    update: {
      rating,
      comment,
      images,
    },
  });

  await recalcDestinationRating(destinationId);

  return result;
};

const getDestinationReviewsFromDB = async (
  destinationId: string,
  page: number,
  limit: number,
) => {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where: { destinationId },
      include: {
        user: {
          select: { name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.review.count({ where: { destinationId } }),
  ]);

  return {
    items,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPage: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const listAllReviewsForAdminFromDB = async (opts: {
  page: number;
  limit: number;
  destinationId?: string;
  search?: string;
}, user?: any) => {
  const safeLimit = Math.min(Math.max(opts.limit, 1), 100);
  const safePage = Math.max(opts.page, 1);
  const skip = (safePage - 1) * safeLimit;

  const where: Prisma.ReviewWhereInput = {};

  if (user?.role === 'TRAVEL_AGENT') {
    where.destination = { creatorId: user.id };
  }

  if (opts.destinationId) where.destinationId = opts.destinationId;
  if (opts.search?.trim()) {
    where.comment = { contains: opts.search.trim(), mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        destination: { select: { id: true, name: true, country: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    items,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPage: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const deleteReviewByIdFromDB = async (reviewId: string, user?: any) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { destination: { select: { creatorId: true } } },
  });
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  if (user?.role === 'TRAVEL_AGENT') {
    if (review.destination.creatorId !== user.id) {
      throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized to delete this review');
    }
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  await recalcDestinationRating(review.destinationId);

  return { deletedId: reviewId };
};

export const ReviewService = {
  createReviewIntoDB,
  getDestinationReviewsFromDB,
  listAllReviewsForAdminFromDB,
  deleteReviewByIdFromDB,
};
