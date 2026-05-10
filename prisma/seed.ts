import { Role, TripStatus, BookingType, BookingStatus, TravelStyle, NotificationType, AccommodationType, TimeSlot, ItineraryType } from '@prisma/client';
import { prisma } from '../src/app/lib/prisma';


async function main() {
  console.log('🌱 Starting full database seed...');

  // 0. Clear existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning old data...');
  await prisma.notification.deleteMany();
  await prisma.itineraryItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.accommodation.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.destinationStats.deleteMany();
  await prisma.destination.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.travelPreference.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users via Better Auth API to ensure correct hashing
  console.log('👤 Creating users via Better Auth API...');
  const { auth } = await import('../src/app/lib/auth');
  
  // We need to set headers for the internal API call
  const headers = new Headers();

  const admin = await auth.api.signUpEmail({
    body: {
      email: 'admin@tripplanner.com',
      password: 'password123',
      name: 'Alexander Pierce',
      role: Role.ADMIN,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alexander',
    },
    headers
  });

  const agent = await auth.api.signUpEmail({
    body: {
      email: 'agent@tripplanner.com',
      password: 'password123',
      name: 'Sarah Connor',
      role: Role.TRAVEL_AGENT,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    headers
  });

  const traveler = await auth.api.signUpEmail({
    body: {
      email: 'user@tripplanner.com',
      password: 'password123',
      name: 'John Doe',
      role: Role.USER,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    },
    headers
  });

  if (!admin || !agent || !traveler) {
    throw new Error('Failed to create users via Better Auth API');
  }

  // Update traveler preferences separately as it's a custom table
  await prisma.travelPreference.create({
    data: {
      userId: traveler.user.id,
      travelStyle: TravelStyle.LUXURY,
      interests: ['Photography', 'Fine Dining', 'Scuba Diving'],
    }
  });

  const user = traveler.user; // For subsequent seeding


  // 2. Create Destinations
  console.log('🌍 Creating destinations...');
  const destinationsData = [
    {
      name: 'Santorini',
      country: 'Greece',
      description: 'Santorini is one of the Cyclades islands in the Aegean Sea. It was devastated by a volcanic eruption in the 16th century BC, forever shaping its rugged landscape. The whitewashed, cubiform houses of its 2 principal towns, Fira and Oia, cling to cliffs above an underwater caldera (crater).',
      summary: 'Iconic whitewashed buildings and world-famous sunsets.',
      category: 'Scenic',
      bestSeason: 'May to September',
      avgCostPerDay: 450,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff',
        'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e',
        'https://images.unsplash.com/photo-1533105079780-92b9be482077'
      ],
      tags: ['Romance', 'Ocean', 'History'],
      creatorId: agent.user.id,
    },
    {
      name: 'Bali',
      country: 'Indonesia',
      description: 'Bali is an Indonesian island known for its forested volcanic mountains, iconic rice paddies, beaches and coral reefs. The island is home to religious sites such as cliffside Uluwatu Temple. To the south, the beachside city of Kuta has lively bars, while Seminyak, Sanur and Nusa Dua are popular resort towns.',
      summary: 'A tropical paradise of spirituality, beaches, and lush jungles.',
      category: 'Tropical',
      bestSeason: 'April to October',
      avgCostPerDay: 120,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1537996194471-e657df975ab4',
        'https://images.unsplash.com/photo-1552674605-db6ffd4facb5',
        'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2'
      ],
      tags: ['Spirituality', 'Nature', 'Adventure'],
      creatorId: agent.user.id,
    },
    {
      name: 'Swiss Alps',
      country: 'Switzerland',
      description: 'The Alps are the highest and most extensive mountain range system that lies entirely in Europe, stretching approximately 1,200 km across eight Alpine countries. Switzerland is home to the most dramatic peaks, including the Matterhorn.',
      summary: 'Majestic peaks, luxury skiing, and crystal-clear lakes.',
      category: 'Mountain',
      bestSeason: 'December to March (Skiing), June to August (Hiking)',
      avgCostPerDay: 350,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1531310197839-ccf54634509e',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'
      ],
      tags: ['Snow', 'Skiing', 'Nature'],
      creatorId: admin.user.id,
    },
    {
      name: 'Dubai',
      country: 'UAE',
      description: 'Dubai is a city and emirate in the United Arab Emirates luxury shopping, ultramodern architecture and a lively nightlife scene. Burj Khalifa, an 830m-tall tower, dominates the skyscraper-filled skyline. At its foot lies Dubai Fountain, with jets and lights choreographed to music.',
      summary: 'Future meets desert in the capital of luxury.',
      category: 'Luxury',
      bestSeason: 'November to March',
      avgCostPerDay: 600,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
        'https://images.unsplash.com/photo-1518684079-3c830dcef090',
        'https://images.unsplash.com/photo-1526495124232-a02e18494d17'
      ],
      tags: ['Luxury', 'Modern', 'Shopping'],
      creatorId: admin.user.id,
    },
    {
      name: 'Kyoto',
      country: 'Japan',
      description: 'Kyoto, once the capital of Japan, is a city on the island of Honshu. It’s famous for its numerous classical Buddhist temples, as well as gardens, imperial palaces, Shinto shrines and traditional wooden houses. It’s also known for formal traditions such as kaiseki dining and geisha.',
      summary: 'The timeless cultural heart of ancient Japan.',
      category: 'Cultural',
      bestSeason: 'April (Cherry Blossoms) or November (Autumn Leaves)',
      avgCostPerDay: 180,
      isFeatured: false,
      images: [
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e',
        'https://images.unsplash.com/photo-1545569341-9eb8b30979d9',
        'https://images.unsplash.com/photo-1528164344705-47542687990d'
      ],
      tags: ['Zen', 'Temple', 'Culture'],
      creatorId: admin.user.id,
    },
  ];

  const destinations = [];
  for (const d of destinationsData) {
    const created = await prisma.destination.create({
      data: {
        ...d,
        stats: {
          create: {
            viewCount: Math.floor(Math.random() * 5000),
            bookingCount: Math.floor(Math.random() * 200),
            averageRating: 4.5 + Math.random() * 0.5,
          }
        }
      }
    });
    destinations.push(created);
  }

  // 3. Create Activities
  console.log('⛷️ Creating activities...');
  const activitiesData = [
    {
      destinationId: destinations[0].id, // Santorini
      name: 'Oia Sunset Catamaran Cruise',
      description: 'A 5-hour cruise with stops for swimming and snorkeling, ending with the spectacular Oia sunset.',
      type: 'Adventure',
      price: 180,
      duration: '5 hours',
      rating: 4.9,
      images: ['https://images.unsplash.com/photo-1534351590666-13e3e96b5017'],
      creatorId: agent.user.id,
    },
    {
      destinationId: destinations[1].id, // Bali
      name: 'Ubud Jungle Swing & Rice Terrace',
      description: 'Experience the thrill of swinging over the jungle and explore the Tegalalang Rice Terraces.',
      type: 'Nature',
      price: 45,
      duration: '4 hours',
      rating: 4.7,
      images: ['https://images.unsplash.com/photo-1537996194471-e657df975ab4'],
      creatorId: agent.user.id,
    },
    {
      destinationId: destinations[2].id, // Swiss Alps
      name: 'Helicopter Tour over the Matterhorn',
      description: 'Get a birds-eye view of the most famous peak in the Alps.',
      type: 'Luxury',
      price: 450,
      duration: '30 mins',
      rating: 5.0,
      images: ['https://images.unsplash.com/photo-1531310197839-ccf54634509e'],
      creatorId: admin.user.id,
    },
  ];

  for (const a of activitiesData) {
    await prisma.activity.create({ data: a });
  }

  // 4. Create Accommodations
  console.log('🏨 Creating accommodations...');
  const accommodationsData = [
    {
      destinationId: destinations[0].id, // Santorini
      name: 'Canaves Oia Luxury Suites',
      type: AccommodationType.RESORT,
      pricePerNight: 850,
      rating: 4.9,
      location: 'Oia, Santorini',
      amenities: ['Infinity Pool', 'Wine Cellar', 'Private Terrace'],
      images: ['https://images.unsplash.com/photo-1515404929826-76fff9fef204'],
      creatorId: agent.user.id,
    },
    {
      destinationId: destinations[3].id, // Dubai
      name: 'Burj Al Arab Jumeirah',
      type: AccommodationType.HOTEL,
      pricePerNight: 1800,
      rating: 5.0,
      location: 'Jumeirah Street, Dubai',
      amenities: ['Private Butler', 'Gold-plated iPads', 'Helipad'],
      images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'],
      creatorId: admin.user.id,
    },
  ];

  for (const acc of accommodationsData) {
    await prisma.accommodation.create({ data: acc });
  }

  // 5. Create Trips for User
  console.log('✈️ Creating user trips...');
  const trip = await prisma.trip.create({
    data: {
      userId: user.id,
      destinationId: destinations[1].id, // Bali
      title: 'Bali Summer Getaway',
      startDate: new Date('2024-07-15'),
      endDate: new Date('2024-07-22'),
      status: TripStatus.BOOKED,
      totalBudget: 2500,
      travelerCount: 2,
      itineraryItems: {
        create: [
          {
            day: 1,
            timeSlot: TimeSlot.morning,
            title: 'Arrival & Check-in',
            type: ItineraryType.TRANSPORT,
            location: 'Denpasar Airport',
          },
          {
            day: 1,
            timeSlot: TimeSlot.evening,
            title: 'Welcome Dinner',
            type: ItineraryType.DINING,
            location: 'Jimbaran Beach',
          }
        ]
      }
    }
  });

  // 6. Create Bookings (for Analytics)
  console.log('📊 Creating bookings for analytics...');
  const bookingData = [
    {
      userId: user.id,
      tripId: trip.id,
      type: BookingType.HOTEL,
      status: BookingStatus.CONFIRMED,
      totalAmount: 1200,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
    {
      userId: user.id,
      type: BookingType.FLIGHT,
      status: BookingStatus.CONFIRMED,
      totalAmount: 850,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    },
    {
      userId: user.id,
      type: BookingType.ACTIVITY,
      status: BookingStatus.CONFIRMED,
      totalAmount: 300,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  ];

  for (const b of bookingData) {
    await prisma.booking.create({ data: b });
  }

  // 7. Create Reviews
  console.log('⭐ Creating reviews...');
  await prisma.review.create({
    data: {
      userId: user.id,
      destinationId: destinations[0].id,
      rating: 5,
      comment: 'Absolutely breathtaking! The sunsets in Oia are everything people say they are and more.',
      images: ['https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff'],
    }
  });

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
