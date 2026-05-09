import { Router } from 'express';
import { UserRoutes } from '../module/user/user.route';
import { DestinationRoutes } from '../module/destination/destination.route';
import { TripRoutes } from '../module/trip/trip.route';
import { BookingRoutes } from '../module/booking/booking.route';
import { ReviewRoutes } from '../module/review/review.route';
import { ActivityRoutes } from '../module/activity/activity.route';
import { AccommodationRoutes } from '../module/accommodation/accommodation.route';
import { AIRoutes } from '../module/ai/ai.route';
import { NotificationRoutes } from '../module/notification/notification.route';
import { TravelPreferenceRoutes } from '../module/travelPreference/travelPreference.route';

const router = Router();

const moduleRoutes = [
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/destination',
    route: DestinationRoutes,
  },
  {
    path: '/trip',
    route: TripRoutes,
  },
  {
    path: '/booking',
    route: BookingRoutes,
  },
  {
    path: '/review',
    route: ReviewRoutes,
  },
  {
    path: '/activity',
    route: ActivityRoutes,
  },
  {
    path: '/accommodation',
    route: AccommodationRoutes,
  },
  {
    path: '/ai',
    route: AIRoutes,
  },
  {
    path: '/notification',
    route: NotificationRoutes,
  },
  {
    path: '/preference',
    route: TravelPreferenceRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
