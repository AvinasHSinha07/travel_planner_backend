import { prisma } from '../../lib/prisma';

const createReviewIntoDB = async (userId: string, payload: any) => {
  const result = await prisma.review.create({
    data: {
      ...payload,
      userId,
    },
  });

  // Update destination average rating
  const allReviews = await prisma.review.findMany({
    where: { destinationId: payload.destinationId },
  });
  
  const avgRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length;

  await prisma.destination.update({
    where: { id: payload.destinationId },
    data: { rating: avgRating },
  });

  return result;
};

const getDestinationReviewsFromDB = async (destinationId: string) => {
  const result = await prisma.review.findMany({
    where: { destinationId },
    include: {
      user: {
        select: { name: true, avatar: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return result;
};

export const ReviewService = {
  createReviewIntoDB,
  getDestinationReviewsFromDB,
};
