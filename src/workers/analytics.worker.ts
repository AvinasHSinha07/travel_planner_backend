import { Worker } from 'bullmq';
import { redis } from '../app/lib/redis';
import { prisma } from '../app/lib/prisma';

// Analytics aggregation functions
const analyticsProcessors = {
  // Aggregate daily stats
  'aggregate-daily-stats': async (data: { date: string }) => {
    const { date } = data;
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    console.log(`[ANALYTICS WORKER] Aggregating stats for ${date}`);
    
    try {
      // Count new users
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: targetDate,
            lt: nextDate,
          },
        },
      });
      
      // Count new trips
      const newTrips = await prisma.trip.count({
        where: {
          createdAt: {
            gte: targetDate,
            lt: nextDate,
          },
        },
      });
      
      // Count new bookings
      const newBookings = await prisma.booking.count({
        where: {
          createdAt: {
            gte: targetDate,
            lt: nextDate,
          },
        },
      });
      
      // Calculate revenue
      const revenue = await prisma.booking.aggregate({
        where: {
          createdAt: {
            gte: targetDate,
            lt: nextDate,
          },
          status: 'CONFIRMED',
        },
        _sum: {
          totalAmount: true,
        },
      });
      
      // Update or create daily stats
      await prisma.analyticsDailyStats.upsert({
        where: {
          date: targetDate,
        },
        update: {
          newUsers,
          newTrips,
          newBookings,
          revenue: revenue._sum.totalAmount || 0,
        },
        create: {
          date: targetDate,
          newUsers,
          newTrips,
          newBookings,
          revenue: revenue._sum.totalAmount || 0,
        },
      });
      
      console.log(`[ANALYTICS WORKER] Stats aggregated for ${date}:`, {
        newUsers,
        newTrips,
        newBookings,
        revenue: revenue._sum.totalAmount || 0,
      });
      
      return { success: true, date, newUsers, newTrips, newBookings };
    } catch (error) {
      console.error(`[ANALYTICS WORKER] Failed to aggregate stats:`, error);
      throw error;
    }
  },
  
  // Update destination stats
  'update-destination-stats': async (data: { destinationId: string }) => {
    const { destinationId } = data;
    
    console.log(`[ANALYTICS WORKER] Updating stats for destination ${destinationId}`);
    
    try {
      // Count trips to this destination
      const tripCount = await prisma.trip.count({
        where: { destinationId },
      });
      
      // Calculate average rating
      const avgRating = await prisma.review.aggregate({
        where: { destinationId },
        _avg: {
          rating: true,
        },
      });
      
      // Count reviews
      const reviewCount = await prisma.review.count({
        where: { destinationId },
      });
      
      // Calculate total bookings
      const totalBookings = await prisma.booking.count({
        where: {
          trip: {
            destinationId,
          },
        },
      });
      
      // Update destination stats
      await prisma.destinationStats.upsert({
        where: { destinationId },
        update: {
          tripCount,
          averageRating: avgRating._avg.rating || 0,
          reviewCount,
          totalBookings,
          lastUpdated: new Date(),
        },
        create: {
          destinationId,
          tripCount,
          averageRating: avgRating._avg.rating || 0,
          reviewCount,
          totalBookings,
          lastUpdated: new Date(),
        },
      });
      
      // Update destination rating
      await prisma.destination.update({
        where: { id: destinationId },
        data: {
          rating: avgRating._avg.rating || 0,
          reviewCount,
        },
      });
      
      console.log(`[ANALYTICS WORKER] Destination stats updated for ${destinationId}`);
      return { success: true, destinationId, tripCount, averageRating: avgRating._avg.rating };
    } catch (error) {
      console.error(`[ANALYTICS WORKER] Failed to update destination stats:`, error);
      throw error;
    }
  },
  
  // Calculate user statistics
  'calculate-user-stats': async (data: { userId: string }) => {
    const { userId } = data;
    
    console.log(`[ANALYTICS WORKER] Calculating stats for user ${userId}`);
    
    try {
      // Count trips
      const totalTrips = await prisma.trip.count({
        where: { userId },
      });
      
      // Count bookings
      const totalBookings = await prisma.booking.count({
        where: { userId },
      });
      
      // Calculate total spent
      const totalSpent = await prisma.booking.aggregate({
        where: {
          userId,
          status: 'CONFIRMED',
        },
        _sum: {
          totalAmount: true,
        },
      });
      
      // Get unique destinations visited
      const uniqueDestinations = await prisma.trip.groupBy({
        by: ['destinationId'],
        where: { userId },
        _count: {
          destinationId: true,
        },
      });
      
      console.log(`[ANALYTICS WORKER] User stats calculated for ${userId}:`, {
        totalTrips,
        totalBookings,
        totalSpent: totalSpent._sum.totalAmount || 0,
        uniqueDestinations: uniqueDestinations.length,
      });
      
      return {
        success: true,
        userId,
        totalTrips,
        totalBookings,
        totalSpent: totalSpent._sum.totalAmount || 0,
        uniqueDestinations: uniqueDestinations.length,
      };
    } catch (error) {
      console.error(`[ANALYTICS WORKER] Failed to calculate user stats:`, error);
      throw error;
    }
  },
};

// Create analytics worker
export const analyticsWorker = new Worker(
  'analytics',
  async (job) => {
    const { type, ...data } = job.data;
    
    console.log(`[ANALYTICS WORKER] Processing job ${job.id} - Type: ${type}`);
    
    const processor = analyticsProcessors[type as keyof typeof analyticsProcessors];
    if (!processor) {
      throw new Error(`Unknown analytics job type: ${type}`);
    }
    
    return await processor(data);
  },
  { 
    connection: redis,
    concurrency: 5,
  }
);

analyticsWorker.on('completed', (job) => {
  console.log(`[ANALYTICS WORKER] Job ${job.id} completed`);
});

analyticsWorker.on('failed', (job, err) => {
  console.error(`[ANALYTICS WORKER] Job ${job?.id} failed:`, err);
});

console.log('[ANALYTICS WORKER] Analytics worker started');
