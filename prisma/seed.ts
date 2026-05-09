import { Role, TripStatus, BookingType, BookingStatus, TravelStyle, NotificationType, AccommodationType } from '@prisma/client';
import { prisma } from '../src/app/lib/prisma';
import bcrypt from 'bcrypt';

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
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = 10;

  // 1. Create Admin User
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@travelplanner.com',
      name: 'Planora Admin',
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      userId: admin.id,
      accountId: 'admin@travelplanner.com',
      providerId: 'email',
      password: adminPassword,
    },
  });

  // 2. Create Travel Agent
  const agentPassword = await bcrypt.hash('agent123', saltRounds);
  const agent = await prisma.user.create({
    data: {
      email: 'agent@travelplanner.com',
      name: 'Planora Agent',
      role: Role.TRAVEL_AGENT,
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      userId: agent.id,
      accountId: 'agent@travelplanner.com',
      providerId: 'email',
      password: agentPassword,
    },
  });

  // 3. Create Regular User
  const userPassword = await bcrypt.hash('user123', saltRounds);
  const user = await prisma.user.create({
    data: {
      email: 'user@travelplanner.com',
      name: 'Planora Traveler',
      role: Role.USER,
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: 'user@travelplanner.com',
      providerId: 'email',
      password: userPassword,
    },
  });

  // 4. Create Sample Destinations
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

  // 5. Create Activities
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

  // 6. Create Accommodations
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
