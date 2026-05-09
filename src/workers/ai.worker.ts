import { Worker } from 'bullmq';
import { redis } from '../app/lib/redis';
import { prisma } from '../app/lib/prisma';
import { callGeminiWithFallback, extractJSONFromResponse, captionTravelImageWithGemini } from '../app/utils/gemini';

type GenerateItineraryPayload = {
  tripId: string;
  userId: string;
  prompt: string;
  type?: string;
};

// AI Job Processors — keyed by BullMQ job.name (see queue.ts `aiQueue.add(name, data)`)
const aiProcessors: Record<string, (data: Record<string, unknown>) => Promise<unknown>> = {
  'generate-itinerary': async (data) => {
    const { tripId, userId, prompt } = data as GenerateItineraryPayload;

    console.log(`[AI WORKER] Generating itinerary for trip ${tripId}`);

    const text = await callGeminiWithFallback(prompt);
    const itineraryData = extractJSONFromResponse(text);

    await prisma.itineraryItem.deleteMany({ where: { tripId } });

    await prisma.itineraryItem.createMany({
      data: itineraryData.map((item: Record<string, unknown>, index: number) => ({
        tripId,
        day: item.day as number,
        timeSlot: item.timeSlot as string,
        title: item.title as string,
        description: item.description as string,
        location: item.location as string,
        type: item.type as string,
        estimatedCost: (item.estimatedCost as number) || 0,
        order: index,
      })),
    });

    await prisma.notification.create({
      data: {
        userId,
        title: 'Itinerary Ready',
        message: 'Your AI-generated itinerary is ready!',
        type: 'TRIP_REMINDER',
      },
    });

    console.log(`[AI WORKER] Itinerary generated for trip ${tripId}`);
    return { success: true, itemCount: itineraryData.length };
  },

  recommendations: async () => ({ success: true, note: 'Recommendations are computed in-request' }),

  /** Job name from queueJobs.categorizeDestination */
  categorize: async (data) => {
    const { destinationId, prompt } = data as { destinationId: string; prompt: string };
    console.log(`[AI WORKER] Categorizing destination ${destinationId}`);
    const text = await callGeminiWithFallback(prompt);
    const result = extractJSONFromResponse(text) as {
      categories: string[];
      suggestedTags: string[];
    };
    await prisma.destination.update({
      where: { id: destinationId },
      data: {
        category: result.categories[0],
        tags: result.suggestedTags,
      },
    });
    return { success: true, categories: result.categories };
  },

  caption: async (data) => {
    const { imageUrl } = data as { imageUrl: string };
    const cap = await captionTravelImageWithGemini(imageUrl);
    return { success: true, ...cap };
  },

  analyze: async () => ({ success: true, note: 'Analyze runs in-request' }),
};

export const aiWorker = new Worker(
  'ai',
  async (job) => {
    const processor = aiProcessors[job.name];
    if (!processor) {
      throw new Error(`Unknown AI job name: ${job.name}`);
    }
    return await processor(job.data as Record<string, unknown>);
  },
  {
    connection: redis,
    concurrency: 3,
  },
);

aiWorker.on('completed', (job) => {
  console.log(`[AI WORKER] Job ${job.id} completed`);
});

aiWorker.on('failed', (job, err) => {
  console.error(`[AI WORKER] Job ${job?.id} failed:`, err);
});

console.log('[AI WORKER] AI worker started');
