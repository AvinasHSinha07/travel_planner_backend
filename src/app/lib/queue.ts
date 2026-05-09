import { Queue, Job } from 'bullmq';
import { redis } from './redis';

// Define queues
export const emailQueue = new Queue('email', { 
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const aiQueue = new Queue('ai', { 
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const analyticsQueue = new Queue('analytics', { 
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
});

// Job data types
export interface EmailJobData {
  type: 'booking_confirmation' | 'welcome' | 'trip_reminder' | 'payment_receipt';
  userId: string;
  email: string;
  metadata: Record<string, any>;
}

export interface AIJobData {
  type: 'itinerary' | 'recommendations' | 'categorize' | 'caption' | 'analyze';
  prompt: string;
  userId?: string;
  tripId?: string;
  destinationId?: string;
  imageUrl?: string;
}

export interface AnalyticsJobData {
  type: 'daily_stats' | 'destination_stats' | 'user_analytics';
  date?: string;
  destinationId?: string;
  userId?: string;
}

// Queue helpers
export const queueJobs = {
  // Email jobs
  async sendBookingConfirmation(userId: string, email: string, bookingData: any): Promise<Job<EmailJobData>> {
    return emailQueue.add('booking-confirmation', {
      type: 'booking_confirmation',
      userId,
      email,
      metadata: bookingData,
    });
  },

  async sendWelcomeEmail(userId: string, email: string, name: string): Promise<Job<EmailJobData>> {
    return emailQueue.add('welcome', {
      type: 'welcome',
      userId,
      email,
      metadata: { name },
    });
  },

  async sendTripReminder(userId: string, email: string, tripData: any): Promise<Job<EmailJobData>> {
    return emailQueue.add('trip-reminder', {
      type: 'trip_reminder',
      userId,
      email,
      metadata: tripData,
    });
  },

  // AI jobs
  async generateItinerary(tripId: string, userId: string, prompt: string): Promise<Job<AIJobData>> {
    return aiQueue.add('generate-itinerary', {
      type: 'itinerary',
      tripId,
      userId,
      prompt,
    }, {
      priority: 1,
    });
  },

  async getRecommendations(userId: string, prompt: string): Promise<Job<AIJobData>> {
    return aiQueue.add('recommendations', {
      type: 'recommendations',
      userId,
      prompt,
    });
  },

  async categorizeDestination(destinationId: string, prompt: string): Promise<Job<AIJobData>> {
    return aiQueue.add('categorize', {
      type: 'categorize',
      destinationId,
      prompt,
    });
  },

  async captionImage(imageUrl: string, userId?: string): Promise<Job<AIJobData>> {
    return aiQueue.add('caption', {
      type: 'caption',
      imageUrl,
      userId,
    });
  },

  async analyzeData(dataset: string, prompt: string): Promise<Job<AIJobData>> {
    return aiQueue.add('analyze', {
      type: 'analyze',
      prompt,
    });
  },

  // Analytics jobs
  async aggregateDailyStats(date: string): Promise<Job<AnalyticsJobData>> {
    return analyticsQueue.add('daily-stats', {
      type: 'daily_stats',
      date,
    });
  },

  async updateDestinationStats(destinationId: string): Promise<Job<AnalyticsJobData>> {
    return analyticsQueue.add('destination-stats', {
      type: 'destination_stats',
      destinationId,
    });
  },
};

export default {
  emailQueue,
  aiQueue,
  analyticsQueue,
  queueJobs,
};
