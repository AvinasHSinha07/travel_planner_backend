import { Role, TripStatus, BookingType, BookingStatus, TravelStyle, NotificationType, AccommodationType } from '@prisma/client';
import { prisma } from '../src/app/lib/prisma';

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (in reverse order of dependencies)
  await prisma.itineraryItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.accommodation.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.destination.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@planora.com',
      name: 'Planora Admin',
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  // 2. Create Sample Destinations
  const maldives = await prisma.destination.create({
    data: {
      name: 'Maldives',
      country: 'Maldives',
      description: 'The Maldives is a tropical nation in the Indian Ocean composed of 26 ring-shaped atolls, which are made up of more than 1,000 coral islands.',
      summary: 'Ultimate Luxury Overwater Villas & Pristine Beaches',
      category: 'Beach',
      bestSeason: 'November to April',
      avgCostPerDay: 500,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1514282401047-d79a71a590e8'],
      tags: ['Luxury', 'Romantic', 'Relaxing'],
    },
  });

  const tokyo = await prisma.destination.create({
    data: {
      name: 'Tokyo',
      country: 'Japan',
      description: 'Tokyo, Japan’s busy capital, mixes the ultra-modern and the traditional.',
      summary: 'A Neon-Lit Fusion of Tradition and Technology',
      category: 'City',
      bestSeason: 'March to May & September to November',
      avgCostPerDay: 200,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1540959733332-eab4deabeeaf'],
      tags: ['Culture', 'Food', 'Modern'],
    },
  });

  // 3. Create Activities
  await prisma.activity.create({
    data: {
      destinationId: maldives.id,
      name: 'Private Sunset Cruise',
      description: 'Sail through the turquoise waters of the Maldives while enjoying champagne.',
      type: 'LUXURY',
      price: 300,
      duration: '3 hours',
    },
  });

  // 4. Create Accommodations
  await prisma.accommodation.create({
    data: {
      destinationId: tokyo.id,
      name: 'The Ritz-Carlton, Tokyo',
      type: AccommodationType.HOTEL,
      pricePerNight: 800,
      amenities: ['Sky Bar', 'Michelin Dining', 'Luxury Spa'],
    },
  });

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
