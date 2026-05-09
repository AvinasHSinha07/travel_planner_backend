import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('connect', () => {
  console.log('🔌 Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

// Cache key patterns for travel planner
export const CacheKeys = {
  destinations: {
    list: (hash: string) => `travelplanner:destinations:list:${hash}`,
    popular: 'travelplanner:destinations:popular',
    detail: (id: string) => `travelplanner:destinations:${id}`,
    byCountry: (country: string) => `travelplanner:destinations:country:${country}`,
  },
  activities: {
    byDestination: (destId: string) => `travelplanner:activities:dest:${destId}`,
  },
  accommodations: {
    byDestination: (destId: string) => `travelplanner:accommodations:dest:${destId}`,
  },
  trips: {
    byUser: (userId: string) => `travelplanner:trips:user:${userId}`,
    detail: (tripId: string) => `travelplanner:trips:${tripId}`,
  },
  itinerary: (tripId: string) => `travelplanner:itinerary:${tripId}`,
  ai: {
    itinerary: (hash: string) => `travelplanner:ai:itinerary:${hash}`,
    recommendations: (userId: string) => `travelplanner:ai:recommendations:${userId}`,
    chat: (sessionId: string) => `travelplanner:ai:chat:${sessionId}`,
    analysis: (dataset: string) => `travelplanner:ai:analysis:${dataset}`,
  },
  user: {
    preferences: (userId: string) => `travelplanner:preferences:${userId}`,
    session: (token: string) => `travelplanner:session:${token}`,
    notifications: (userId: string) => `travelplanner:notifications:${userId}`,
  },
  bookings: {
    byUser: (userId: string) => `travelplanner:bookings:user:${userId}`,
  },
  reviews: {
    byDestination: (destId: string) => `travelplanner:reviews:dest:${destId}`,
  },
};

// Cache TTL values (in seconds)
export const CacheTTL = {
  SHORT: 60 * 5,      // 5 minutes
  MEDIUM: 60 * 10,    // 10 minutes
  LONG: 60 * 30,      // 30 minutes
  VERY_LONG: 60 * 60, // 1 hour
  AI_RESULTS: 60 * 15, // 15 minutes for AI
};

// Cache utility functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key: string, value: any, ttl: number = CacheTTL.MEDIUM): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  },

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  },

  async invalidateDestinations(): Promise<void> {
    await this.deletePattern('travelplanner:destinations:*');
  },

  async invalidateTrips(userId: string): Promise<void> {
    await this.delete(CacheKeys.trips.byUser(userId));
    await this.deletePattern(`travelplanner:trips:${userId}:*`);
  },

  async invalidateUserData(userId: string): Promise<void> {
    await this.delete(CacheKeys.user.preferences(userId));
    await this.delete(CacheKeys.bookings.byUser(userId));
    await this.invalidateTrips(userId);
  },
};

export default redis;
