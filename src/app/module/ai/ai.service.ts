import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import httpStatus from 'http-status';
import {
  callGeminiWithFallback,
  extractJSONFromResponse,
  geminiModel,
  captionTravelImageWithGemini,
  MODELS,
  apiKeys,
  currentKeyIndex,
  setCurrentKeyIndex,
  getGenAIInstance,
} from '../../utils/gemini';
import { prisma } from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/redis';
import { queueJobs } from '../../lib/queue';
import AppError from '../../errorHelpers/AppError';

// ============================================================================
// Feature 1: AI Trip Itinerary Generator
// ============================================================================
interface ItineraryInput {
  destination: string;
  country: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  travelerCount: number;
  interests?: string[];
  travelStyle?: string;
  dietaryRestrictions?: string[];
}

const generateItinerary = async (tripId: string, requesterId: string, requesterRole: Role) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      destination: true,
      user: {
        include: { preferences: true },
      },
    },
  });

  if (!trip) {
    throw new AppError(httpStatus.NOT_FOUND, 'Trip not found');
  }
  if (requesterRole !== Role.ADMIN && trip.userId !== requesterId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You cannot generate an itinerary for this trip');
  }

  const { destination, user, startDate, endDate, totalBudget, travelerCount } = trip;
  const preferences = user.preferences;

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const prompt = `
    Generate a detailed day-by-day travel itinerary for a trip to ${destination.name}, ${destination.country}.
    Duration: ${days} days (${startDate.toDateString()} to ${endDate.toDateString()}).
    Budget: $${totalBudget} for ${travelerCount} travelers.
    Interests: ${preferences?.interests?.join(', ') || 'General sightseeing'}.
    Travel Style: ${preferences?.travelStyle || 'Balanced'}.
    Dietary Restrictions: ${preferences?.dietaryRestrictions?.join(', ') || 'None'}.
    
    Create ${days} days of activities. For each day, provide activities for morning, afternoon, and evening.
    
    Return ONLY a JSON array in this exact format:
    [
      {
        "day": 1,
        "timeSlot": "morning",
        "title": "Activity name",
        "description": "Detailed description of the activity",
        "location": "Specific location",
        "type": "SIGHTSEEING",
        "estimatedCost": 25
      }
    ]
    
    Rules:
    - Use only these timeSlot values: morning, afternoon, evening, night
    - Use only these type values: SIGHTSEEING, DINING, TRANSPORT, ACTIVITY, REST, ACCOMMODATION
    - estimatedCost should be in USD per person
    - Make activities specific to ${destination.name}, not generic
    - Consider the travel style: ${preferences?.travelStyle || 'balanced'}
  `;

  /** Itinerary generation now always runs synchronously as requested. */

  try {
    const text = await callGeminiWithFallback(prompt);
    const itineraryData = extractJSONFromResponse(text);

    // Clear existing itinerary items for this trip
    await prisma.itineraryItem.deleteMany({ where: { tripId } });

    // Bulk create new itinerary items
    await prisma.itineraryItem.createMany({
      data: itineraryData.map((item: any, index: number) => ({
        tripId,
        day: item.day,
        timeSlot: item.timeSlot,
        title: item.title,
        description: item.description,
        location: item.location,
        type: item.type,
        estimatedCost: item.estimatedCost || 0,
        order: index,
      })),
    });

    return itineraryData;
  } catch (error: any) {
    console.error('AI Itinerary generation failed:', error);
    const message = error?.message?.includes('429') || error?.status === 429
      ? 'AI quota exceeded for the day. Please try again tomorrow or add activities manually.'
      : 'AI itinerary is temporarily unavailable. Please try again in a few minutes or add activities manually.';
    
    throw new AppError(httpStatus.SERVICE_UNAVAILABLE, message);
  }
};

// ============================================================================
// Feature 2: AI Smart Destination Recommendations
// ============================================================================
interface Recommendation {
  destinationId: string;
  name: string;
  country: string;
  matchScore: number;
  reason: string;
  bestTimeToVisit: string;
  estimatedCostPerDay: number;
}

const normalizeRecommendations = (raw: unknown): Recommendation[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: Record<string, unknown>) => {
      let matchScore = Number(r.matchScore ?? 0);
      if (matchScore > 0 && matchScore <= 1) {
        matchScore = Math.round(matchScore * 100);
      }
      if (Number.isNaN(matchScore)) matchScore = 0;
      matchScore = Math.min(100, Math.max(0, Math.round(matchScore)));
      return {
        destinationId: String(r.destinationId ?? ''),
        name: String(r.name ?? ''),
        country: String(r.country ?? ''),
        matchScore,
        reason: String(r.reason ?? ''),
        bestTimeToVisit: String(r.bestTimeToVisit ?? ''),
        estimatedCostPerDay: Number(r.estimatedCostPerDay ?? 0),
      };
    })
    .filter((r) => r.destinationId.length > 0 && r.name.length > 0);
};

const getRecommendations = async (userId: string): Promise<Recommendation[]> => {
  const preferences = await prisma.travelPreference.findUnique({
    where: { userId },
  });

  const userTrips = await prisma.trip.findMany({
    where: { userId },
    include: { destination: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  const visitedDestinations = userTrips.map((t) => t.destination.name);

  const prefPayload = {
    interests: preferences?.interests ?? [],
    budgetRange: preferences?.budgetRange ?? null,
    travelStyle: preferences?.travelStyle ?? null,
    dietaryRestrictions: preferences?.dietaryRestrictions ?? [],
    preferredClimate: preferences?.preferredClimate ?? null,
    mobilityNeeds: preferences?.mobilityNeeds ?? null,
    visited: [...visitedDestinations].sort(),
  };
  const prefHash = createHash('sha256')
    .update(JSON.stringify(prefPayload))
    .digest('hex')
    .slice(0, 16);

  const cacheKey = CacheKeys.ai.recommendations(userId, prefHash);
  const cached = await cache.get<Recommendation[]>(cacheKey);
  if (cached?.length) return normalizeRecommendations(cached);

  const destinations = await prisma.destination.findMany({
    where: {
      name: { notIn: visitedDestinations },
      ...(preferences?.preferredClimate && {
        bestSeason: { contains: preferences.preferredClimate, mode: 'insensitive' },
      }),
    },
    take: 15,
  });

  if (destinations.length === 0) {
    return [];
  }

  const prompt = `
    Based on the user's travel preferences and history, recommend the best destinations.
    
    User Preferences:
    - Interests: ${preferences?.interests?.join(', ') || 'General travel'}
    - Budget Range: ${preferences?.budgetRange || 'Mid-range'}
    - Travel Style: ${preferences?.travelStyle || 'Balanced'}
    - Preferred Climate: ${preferences?.preferredClimate || 'Any'}
    - Mobility Needs: ${preferences?.mobilityNeeds || 'None'}
    
    Previously Visited: ${visitedDestinations.join(', ') || 'None'}
    
    Available Destinations:
    ${destinations.map(d => `
    - ${d.name}, ${d.country}
      Category: ${d.category}
      Average Cost: $${d.avgCostPerDay}/day
      Best Season: ${d.bestSeason}
      Rating: ${d.rating}/5
      Tags: ${d.tags?.join(', ')}
    `).join('\n')}
    
    Return a JSON array with the top 5 recommendations:
    [
      {
        "destinationId": "${destinations[0]?.id || 'id'}",
        "name": "Destination Name",
        "country": "Country",
        "matchScore": 95,
        "reason": "Why this matches the user's preferences",
        "bestTimeToVisit": "Season",
        "estimatedCostPerDay": 150
      }
    ]
    
    Calculate matchScore (0-100) based on how well each destination fits the user's preferences.
  `;

  try {
    const text = await callGeminiWithFallback(prompt);
    const raw = extractJSONFromResponse(text);
    const recommendations = normalizeRecommendations(raw);
    if (recommendations.length) {
      await cache.set(cacheKey, recommendations, CacheTTL.LONG);
      return recommendations;
    }
    return destinations.slice(0, 5).map((d) => ({
      destinationId: d.id,
      name: d.name,
      country: d.country,
      matchScore: 72,
      reason: 'Suggested from our catalog while the model returned an unexpected shape.',
      bestTimeToVisit: d.bestSeason,
      estimatedCostPerDay: d.avgCostPerDay,
    }));
  } catch (error) {
    console.error('AI Recommendations failed:', error);
    const fallback = destinations.slice(0, 5).map((d) => ({
      destinationId: d.id,
      name: d.name,
      country: d.country,
      matchScore: 70,
      reason: 'Popular destination matching your interests',
      bestTimeToVisit: d.bestSeason,
      estimatedCostPerDay: d.avgCostPerDay,
    }));
    return fallback;
  }
};

// ============================================================================
// Feature 3: AI Travel Chat Assistant
// ============================================================================
interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ChatResponse {
  reply: string;
  suggestions: Array<{
    type: string;
    title: string;
    action: string;
  }>;
}

const buildTravelChatContext = async (userId?: string) => {
  const featured = await prisma.destination.findMany({
    where: { isFeatured: true },
    take: 8,
    select: { name: true, country: true, category: true },
  });
  const featuredSummary = featured
    .map((d) => `${d.name}, ${d.country} (${d.category})`)
    .join('; ');

  if (!userId) {
    return { featuredSummary, userBlock: '' as string };
  }

  const [prefs, trips, bookings] = await Promise.all([
    prisma.travelPreference.findUnique({ where: { userId } }),
    prisma.trip.findMany({
      where: { userId },
      take: 5,
      orderBy: { startDate: 'desc' },
      include: { destination: { select: { name: true, country: true } } },
    }),
    prisma.booking.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { type: true, status: true, totalAmount: true },
    }),
  ]);

  const userBlock = [
    prefs ? `Preferences (JSON): ${JSON.stringify(prefs)}` : 'Preferences: not set',
    `Recent trips: ${trips.map((t) => `${t.destination.name} (${t.startDate.toISOString().slice(0, 10)})`).join('; ') || 'none'}`,
    `Recent bookings: ${bookings.map((b) => `${b.type} ${b.status} $${Number(b.totalAmount)}`).join('; ') || 'none'}`,
  ].join('\n');

  return { featuredSummary, userBlock };
};

const chat = async (message: string, history: ChatMessage[], userId?: string): Promise<ChatResponse> => {
  const { featuredSummary, userBlock } = await buildTravelChatContext(userId);

  const prompt = `
    You are a helpful AI travel assistant for TriPlannerAI. Use the context. Be concise and practical.

    Featured destinations: ${featuredSummary}
    ${userBlock ? `${userBlock}\n` : ''}

    Conversation:
    ${history.slice(-8).map((h) => `${h.role}: ${h.content}`).join('\n')}

    User: ${message}

    Return VALID JSON only:
    {
      "reply": "markdown-friendly answer",
      "suggestions": [
        { "type": "destination", "title": "Short CTA label", "action": "/destinations" },
        { "type": "plan", "title": "Dashboard", "action": "/dashboard" }
      ]
    }
  `;

  try {
    const text = await callGeminiWithFallback(prompt);
    return extractJSONFromResponse(text);
  } catch (error) {
    return {
      reply:
        "I'm here to help with destinations, itineraries, and travel tips. Try asking about a place or season.",
      suggestions: [
        { type: 'plan', title: 'Open dashboard', action: '/dashboard' },
        { type: 'destinations', title: 'Browse destinations', action: '/destinations' },
      ],
    };
  }
};

const streamTravelChat = async (
  message: string,
  history: ChatMessage[],
  userId: string | undefined,
  res: Response,
): Promise<void> => {
  const { featuredSummary, userBlock } = await buildTravelChatContext(userId);
  const prompt = `You are a helpful AI travel assistant for TriPlannerAI. Use markdown when it helps (headings, lists). Output prose only — no JSON.

Featured destinations: ${featuredSummary}
${userBlock ? `${userBlock}\n` : ''}

Conversation:
${history.slice(-8).map((h) => `${h.role}: ${h.content}`).join('\n')}

User: ${message}
`;

  // Models to try for streaming
  const modelIds = [...MODELS.flash, ...MODELS.pro];
  let lastError: any = null;

  // Try each API key
  for (let keyAttempt = 0; keyAttempt < apiKeys.length; keyAttempt++) {
    const activeKeyIndex = (currentKeyIndex + keyAttempt) % apiKeys.length;
    const currentGenAI = getGenAIInstance(activeKeyIndex);

    // Try each model with this API key
    for (const modelId of modelIds) {
      try {
        console.log(`[GEMINI-STREAM] Attempting ${modelId} with Key ${activeKeyIndex + 1}/${apiKeys.length}`);
        const model = currentGenAI.getGenerativeModel({ model: modelId });
        
        // Use a timeout for the stream request to avoid hanging
        const streamResult = await Promise.race([
          model.generateContentStream(prompt),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Stream request timeout')), 15000))
        ]) as any;

        let started = false;
        try {
          for await (const chunk of streamResult.stream) {
            if (!started) {
              res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
              (res as any).flushHeaders?.();
              started = true;
            }
            const text = chunk.text();
            if (text) {
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }
        } catch (streamError: any) {
          // If we already started streaming, we can't easily fallback to another key/model
          // but we can try to close gracefully
          console.error(`[GEMINI-STREAM] Error during streaming with ${modelId}:`, streamError);
          if (started) {
            res.write(`data: ${JSON.stringify({ error: 'stream_interrupted' })}\n\n`);
            res.end();
            return;
          }
          throw streamError;
        }

        if (started) {
          res.write('data: [DONE]\n\n');
          res.end();
          setCurrentKeyIndex(activeKeyIndex);
          return; // Success!
        }
      } catch (error: any) {
        lastError = error;
        const msg = error?.message || 'Unknown error';
        const status = error?.status || 0;
        console.warn(`[GEMINI-STREAM] ${modelId} (Key ${activeKeyIndex + 1}) failed:`, msg);

        // If it's a 404 or location error, try next model
        if (status === 404 || msg.includes('404') || msg.includes('not found') || msg.includes('location is not supported')) {
          continue;
        }

        // If the error is a quota error (429), break model loop, try next key
        if (status === 429 || msg.includes('429') || msg.toLowerCase().includes('quota')) {
          console.warn(`[GEMINI-STREAM] Key ${activeKeyIndex + 1} exhausted. Moving to next key...`);
          break; 
        }
        
        // Otherwise try next model for the same key
        continue;
      }
    }
  }

  // If we get here, all models failed
  console.error('streamTravelChat - All models failed', lastError);
  const isQuotaError = lastError?.message?.includes('429') || lastError?.status === 429;
  res.write(`data: ${JSON.stringify({ 
    error: isQuotaError ? 'quota_exceeded' : 'stream_failed',
    message: isQuotaError ? 'AI daily limit reached. Try again later.' : 'All AI models failed to respond.'
  })}\n\n`);
  res.end();
};

// ============================================================================
// Feature 4: AI Travel Data Analyzer
// ============================================================================
interface AnalyticsInsight {
  insights: string[];
  trends: string[];
  budgetTips: string[];
  summary: string;
}

type DatasetType = 'user-trips' | 'spending-patterns' | 'destination-trends' | 'booking-analytics';

/**
 * Prisma raw aggregates can contain BigInt/Date values, which break plain JSON.stringify
 * when building prompts. Normalize to JSON-safe values first.
 */
const toJsonSafe = <T>(value: T): T =>
  JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === 'bigint') return Number(v);
      if (v instanceof Date) return v.toISOString();
      return v;
    }),
  ) as T;

const analyzeData = async (dataset: DatasetType): Promise<AnalyticsInsight> => {
  // Check cache
  const cacheKey = CacheKeys.ai.analysis(dataset);
  const cached = await cache.get<AnalyticsInsight>(cacheKey);
  if (cached) return cached;

  let data: any;
  let context: string;

  switch (dataset) {
    case 'user-trips':
      data = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "startDate") as month,
          COUNT(*) as trip_count,
          AVG("totalBudget") as avg_budget
        FROM "trip"
        WHERE "startDate" > NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month
      `;
      context = 'Trip booking trends over the last 6 months';
      break;

    case 'spending-patterns':
      data = await prisma.$queryRaw`
        SELECT 
          "type",
          AVG("totalAmount") as avg_amount,
          COUNT(*) as booking_count
        FROM "booking"
        WHERE "status" = 'CONFIRMED'
        GROUP BY "type"
      `;
      context = 'Average spending patterns by booking type';
      break;

    case 'destination-trends':
      data = await prisma.$queryRaw`
        SELECT 
          d.name,
          d.country,
          COUNT(t.id) as trip_count,
          AVG(r.rating) as avg_rating
        FROM "destination" d
        LEFT JOIN "trip" t ON t."destinationId" = d.id
        LEFT JOIN "review" r ON r."destinationId" = d.id
        GROUP BY d.id, d.name, d.country
        ORDER BY trip_count DESC
        LIMIT 10
      `;
      context = 'Top destinations by trip volume and ratings';
      break;

    case 'booking-analytics':
      data = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('week', "createdAt") as week,
          "status",
          COUNT(*) as count,
          SUM("totalAmount") as revenue
        FROM "booking"
        WHERE "createdAt" > NOW() - INTERVAL '3 months'
        GROUP BY week, "status"
        ORDER BY week
      `;
      context = 'Booking and revenue trends over the last 3 months';
      break;

    default:
      throw new Error('Unknown dataset type');
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return {
      insights: ['No sufficient data collected for this period yet.'],
      trends: ['Data collection in progress'],
      budgetTips: ['Wait for more bookings to see spending trends'],
      summary: 'Insufficient data for a meaningful analysis at this stage.',
    };
  }

  const prompt = `
    Analyze the following travel platform data and provide actionable insights.
    
    Dataset: ${context}
    Data: ${JSON.stringify(toJsonSafe(data))}
    
    Provide analysis in this JSON format:
    {
      "insights": ["Key finding 1", "Key finding 2", "Key finding 3"],
      "trends": ["Trend 1", "Trend 2"],
      "budgetTips": ["Budget recommendation 1", "Budget recommendation 2"],
      "summary": "Brief executive summary of the analysis"
    }
    
    Insights should be specific and data-driven.
  `;

  try {
    const text = await callGeminiWithFallback(prompt, { usePro: true });
    const analysis = extractJSONFromResponse(text);
    
    // Cache for 1 hour
    await cache.set(cacheKey, analysis, CacheTTL.VERY_LONG);
    
    return analysis;
  } catch (error) {
    console.error('AI Analysis failed:', error);
    return {
      insights: ['Unable to generate insights at this time'],
      trends: [],
      budgetTips: [],
      summary: 'Analysis temporarily unavailable',
    };
  }
};

// ============================================================================
// Feature 5: AI Auto Categorization / Tagging
// ============================================================================
interface CategorizationResult {
  categories: string[];
  confidenceScores: Record<string, number>;
  suggestedTags: string[];
}

const categorize = async (input: {
  name: string;
  description: string;
  activities?: string[];
}): Promise<CategorizationResult> => {
  const prompt = `
    Categorize this travel destination based on its description and activities.
    
    Destination: ${input.name}
    Description: ${input.description}
    ${input.activities ? `Activities: ${input.activities.join(', ')}` : ''}
    
    Categories to choose from: Beach, Adventure, Cultural, Food & Dining, Nature, Urban, Luxury, Budget, Family-friendly, Solo-travel
    
    Return JSON:
    {
      "categories": ["Category1", "Category2"],
      "confidenceScores": { "Category1": 0.92, "Category2": 0.87 },
      "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
    }
    
    Provide 2-3 most relevant categories with confidence scores (0-1).
    Suggest 5 relevant tags for SEO and filtering.
  `;

  try {
    const text = await callGeminiWithFallback(prompt);
    return extractJSONFromResponse(text);
  } catch (error) {
    console.error('AI Categorization failed:', error);
    // Basic fallback categorization
    const desc = input.description.toLowerCase();
    const categories: string[] = [];
    if (desc.includes('beach') || desc.includes('coast')) categories.push('Beach');
    if (desc.includes('hike') || desc.includes('adventure')) categories.push('Adventure');
    if (desc.includes('museum') || desc.includes('history')) categories.push('Cultural');
    if (categories.length === 0) categories.push('Urban');
    
    return {
      categories,
      confidenceScores: { [categories[0]]: 0.85 },
      suggestedTags: ['travel', 'vacation', 'tourism'],
    };
  }
};

// ============================================================================
// Feature 6: AI Image Captioning
// ============================================================================
interface CaptionResult {
  caption: string;
  detectedLocation?: string;
  tags: string[];
  suggestedHashtags: string[];
}

const captionImage = async (imageUrl: string): Promise<CaptionResult> => {
  const result = await captionTravelImageWithGemini(imageUrl);
  return {
    caption: result.caption,
    detectedLocation: result.detectedLocation,
    tags: result.tags,
    suggestedHashtags: result.suggestedHashtags,
  };
};

// ============================================================================
// Export Service
// ============================================================================
export const AIService = {
  generateItinerary,
  getRecommendations,
  chat,
  streamTravelChat,
  analyzeData,
  categorize,
  captionImage,
};
