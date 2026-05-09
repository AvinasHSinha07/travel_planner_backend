import { geminiModel } from '../../utils/gemini';
import { prisma } from '../../lib/prisma';

const generateItinerary = async (tripId: string) => {
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

  const prompt = `
    Generate a detailed day-by-day travel itinerary for a trip to ${destination.name}, ${destination.country}.
    Duration: ${startDate.toDateString()} to ${endDate.toDateString()}.
    Budget: $${totalBudget} for ${travelerCount} travelers.
    Interests: ${preferences?.interests?.join(', ') || 'General sightseeing'}.
    Travel Style: ${preferences?.travelStyle || 'Balanced'}.
    
    Please return the itinerary in a JSON format that matches the following structure:
    [
      {
        "day": 1,
        "timeSlot": "morning",
        "title": "...",
        "description": "...",
        "type": "SIGHTSEEING"
      },
      ...
    ]
    Use only these timeSlot values: morning, afternoon, evening, night.
    Use only these type values: SIGHTSEEING, DINING, TRANSPORT, ACTIVITY, REST, ACCOMMODATION.
  `;

  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Extract JSON from the text response
  const jsonMatch = text.match(/\[.*\]/s);
  if (!jsonMatch) throw new Error('Failed to generate valid itinerary JSON');
  
  const itineraryData = JSON.parse(jsonMatch[0]);

  // Clear existing itinerary items for this trip
  await prisma.itineraryItem.deleteMany({ where: { tripId } });

  // Bulk create new itinerary items
  const createdItems = await prisma.itineraryItem.createMany({
    data: itineraryData.map((item: any, index: number) => ({
      ...item,
      tripId,
      order: index,
    })),
  });

  return itineraryData;
};

export const AIService = {
  generateItinerary,
};
