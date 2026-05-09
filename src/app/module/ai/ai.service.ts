import { 
  callGeminiWithFallback, 
  extractJSONFromResponse, 
  geminiVisionModel 
} from '../../utils/gemini';
import { prisma } from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/redis';
import { queueJobs } from '../../lib/queue';
import crypto from 'crypto';

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

const generateItinerary = async (tripId: string) => {
  // Check cache first
  const cacheKey = CacheKeys.itinerary(tripId);
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      destination: true,
      user: {
        include: { preferences: true }
      }
    },
  });

  if (!trip) throw new Error('Trip not found');

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

  // Check if we should queue this (large prompt)
  if (prompt.length > 800) {
    const job = await queueJobs.generateItinerary(tripId, trip.userId, prompt);
    return { status: 'queued', jobId: job.id, message: 'Itinerary generation queued due to complexity' };
  }

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

    // Cache the result
    await cache.set(cacheKey, itineraryData, CacheTTL.AI_RESULTS);

    return itineraryData;
  } catch (error) {
    console.error('AI Itinerary generation failed:', error);
    throw new Error('Failed to generate itinerary. Please try again or plan manually.');
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

const getRecommendations = async (userId: string): Promise<Recommendation[]> => {
  // Check cache
  const cacheKey = CacheKeys.ai.recommendations(userId);
  const cached = await cache.get<Recommendation[]>(cacheKey);
  if (cached) return cached;

  // Get user preferences
  const preferences = await prisma.travelPreference.findUnique({
    where: { userId },
  });

  // Get user's travel history
  const userTrips = await prisma.trip.findMany({
    where: { userId },
    include: { destination: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  const visitedDestinations = userTrips.map(t => t.destination.name);

  // Query potential destinations based on preferences
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
    const recommendations = extractJSONFromResponse(text);
    
    // Cache for 30 minutes
    await cache.set(cacheKey, recommendations, CacheTTL.LONG);
    
    return recommendations;
  } catch (error) {
    console.error('AI Recommendations failed:', error);
    // Return basic recommendations from the destinations list
    return destinations.slice(0, 5).map(d => ({
      destinationId: d.id,
      name: d.name,
      country: d.country,
      matchScore: Math.floor(Math.random() * 20) + 75, // Fallback score
      reason: 'Popular destination matching your interests',
      bestTimeToVisit: d.bestSeason,
      estimatedCostPerDay: d.avgCostPerDay,
    }));
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

const chat = async (message: string, history: ChatMessage[], userId?: string): Promise<ChatResponse> => {
  // Fetch travel context
  const popularDestinations = await prisma.destination.findMany({
    where: { isFeatured: true },
    take: 5,
  });

  let userContext = '';
  if (userId) {
    const userTrips = await prisma.trip.findMany({
      where: { userId },
      include: { destination: true },
      take: 3,
      orderBy: { startDate: 'desc' },
    });
    userContext = `User's recent trips: ${userTrips.map(t => t.destination.name).join(', ')}`;
  }

  const prompt = `
    You are a helpful AI travel assistant. Answer the user's question based on your knowledge and the provided context.
    
    Popular Destinations: ${popularDestinations.map(d => d.name).join(', ')}
    ${userContext}
    
    Conversation History:
    ${history.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n')}
    
    User: ${message}
    
    Provide a helpful, friendly response. Include practical travel advice when relevant.
    Suggest specific destinations or activities if appropriate.
    
    Return JSON format:
    {
      "reply": "Your detailed response here",
      "suggestions": [
        { "type": "destination", "title": "Consider visiting...", "action": "/destinations/xyz" },
        { "type": "plan", "title": "Plan a trip", "action": "/dashboard/trips/new" }
      ]
    }
  `;

  try {
    const text = await callGeminiWithFallback(prompt);
    return extractJSONFromResponse(text);
  } catch (error) {
    // Fallback response
    return {
      reply: "I'm here to help with your travel questions! You can ask me about destinations, activities, travel tips, or help planning your trip.",
      suggestions: [
        { type: 'plan', title: 'Plan a new trip', action: '/dashboard' },
        { type: 'destinations', title: 'Browse destinations', action: '/destinations' },
      ],
    };
  }
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

  const prompt = `
    Analyze the following travel platform data and provide actionable insights.
    
    Dataset: ${context}
    Data: ${JSON.stringify(data)}
    
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
  const prompt = `
    Analyze this travel photo and provide:
    1. A descriptive caption (2-3 sentences)
    2. The likely location if identifiable
    3. 5-7 relevant tags
    4. 3-5 suggested hashtags
    
    Return JSON:
    {
      "caption": "Beautiful sunset over the ancient temples...",
      "detectedLocation": "Angkor Wat, Cambodia",
      "tags": ["temple", "sunset", "heritage", "travel"],
      "suggestedHashtags": ["#AngkorWat", "#Cambodia", "#TravelPhotography"]
    }
  `;

  try {
    // For vision model, we need to use the specific vision capabilities
    const result = await geminiVisionModel.generateContent([
      { text: prompt },
      { inlineData: { mimeType: 'image/jpeg', data: imageUrl } },
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    return extractJSONFromResponse(text);
  } catch (error) {
    console.error('AI Image Captioning failed:', error);
    return {
      caption: 'A beautiful travel destination',
      tags: ['travel', 'photography'],
      suggestedHashtags: ['#Travel', '#Wanderlust'],
    };
  }
};

// ============================================================================
// Export Service
// ============================================================================
export const AIService = {
  generateItinerary,
  getRecommendations,
  chat,
  analyzeData,
  categorize,
  captionImage,
};
