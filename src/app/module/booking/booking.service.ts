import { BookingStatus, BookingType, Prisma, Role, TripStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { prisma } from '../../lib/prisma';
import { stripe } from '../../utils/stripe';
import { env } from '../../config/env';
import AppError from '../../errorHelpers/AppError';

const bookingInclude = {
  trip: {
    include: {
      destination: { select: { id: true, name: true, country: true } },
    },
  },
} as const;

const bookingStaffInclude = {
  ...bookingInclude,
  user: {
    select: { id: true, name: true, email: true },
  },
} as const;

export function primaryClientOrigin(): string {
  return (env.CLIENT_URL?.split(',')[0] ?? 'http://localhost:3000').trim().replace(/\/$/, '');
}

/**
 * Checkout creation response (stable contract for frontend):
 * { checkoutUrl, url, bookingId } — `url` mirrors `checkoutUrl` for clients that expect either name.
 */
const createBookingIntoDB = async (userId: string, payload: any) => {
  if (!stripe) {
    throw new AppError(503, 'Payments are not configured (missing STRIPE_SECRET_KEY).');
  }

  const { tripId, destinationId, type, totalAmount } = payload;

  const metadata: Prisma.InputJsonValue =
    destinationId != null ? { destinationId } : {};

  const booking = await prisma.booking.create({
    data: {
      userId,
      tripId: tripId ?? null,
      type,
      totalAmount,
      status: BookingStatus.PENDING,
      metadata: destinationId != null ? metadata : undefined,
    },
  });

  const origin = primaryClientOrigin();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${type} Booking`,
          },
          unit_amount: Math.round(totalAmount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payment/cancel`,
    metadata: {
      bookingId: booking.id,
      userId,
      ...(destinationId ? { destinationId } : {}),
    },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      stripeSessionId: session.id,
    },
  });

  const checkoutUrl = session.url ?? '';
  return {
    checkoutUrl,
    url: checkoutUrl,
    bookingId: booking.id,
  };
};

const getMyBookingsFromDB = async (userId: string) => {
  return prisma.booking.findMany({
    where: { userId },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
  });
};

type StaffBookingQuery = {
  status?: BookingStatus;
  type?: BookingType;
  page: number;
  limit: number;
};

const getStaffBookingsFromDB = async (q: StaffBookingQuery) => {
  const where: Prisma.BookingWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.type) where.type = q.type;

  const skip = (q.page - 1) * q.limit;

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingStaffInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: q.limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    items,
    meta: {
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.ceil(total / q.limit) || 1,
    },
  };
};

const verifyCheckoutSessionForUser = async (
  userId: string,
  sessionId: string,
  role: Role,
) => {
  if (!stripe) {
    throw new AppError(503, 'Payments are not configured.');
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const bookingId = session.metadata?.bookingId;

  if (!bookingId) {
    throw new AppError(400, 'Checkout session has no booking metadata.');
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingStaffInclude,
  });

  if (!booking) {
    throw new AppError(404, 'Booking not found.');
  }

  const isStaff = role === Role.ADMIN || role === Role.TRAVEL_AGENT;
  if (!isStaff && booking.userId !== userId) {
    throw new AppError(403, 'You cannot verify this checkout session.');
  }

  return {
    booking,
    paymentStatus: session.payment_status,
    status: session.status,
  };
};

const handleStripeWebhook = async (rawBody: Buffer, signature: string | string[] | undefined) => {
  let event: Stripe.Event;

  const sigHeader = Array.isArray(signature) ? signature[0] : signature;

  if (env.STRIPE_WEBHOOK_SECRET && sigHeader) {
    if (!stripe) {
      throw new AppError(503, 'Stripe is not configured.');
    }
    event = stripe.webhooks.constructEvent(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  } else if (env.NODE_ENV === 'development') {
    console.warn('[STRIPE] Webhook processed without signature verification (dev only).');
    event = JSON.parse(rawBody.toString('utf8')) as unknown as Stripe.Event;
  } else {
    throw new AppError(400, 'Missing Stripe webhook signature or STRIPE_WEBHOOK_SECRET.');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      console.error('[STRIPE] checkout.session.completed missing bookingId metadata');
      return;
    }

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        trip: { select: { id: true, title: true } },
      },
    });

    if (booking.tripId) {
      await prisma.trip.updateMany({
        where: { id: booking.tripId, status: { not: TripStatus.CANCELLED } },
        data: { status: TripStatus.BOOKED },
      });
    }

    await prisma.notification.create({
      data: {
        userId: booking.userId,
        type: 'BOOKING',
        title: 'Booking confirmed',
        message: `Your ${booking.type} payment was successful${booking.trip ? ` for trip "${booking.trip.title}"` : ''}.`,
      },
    });

    try {
      const { queueJobs } = await import('../../lib/queue');
      if (booking.user.email) {
        await queueJobs
          .sendBookingConfirmation(booking.userId, booking.user.email, {
            bookingId: booking.id,
            type: booking.type,
            amount: booking.totalAmount,
            tripTitle: booking.trip?.title,
          })
          .catch((err) => console.warn('[STRIPE] email queue enqueue failed:', err));
      }
    } catch (e) {
      console.warn('[STRIPE] email queue unavailable:', e);
    }
  }
};

const updateBookingStatusInDB = async (
  bookingId: string,
  status: BookingStatus,
  actorRole: Role,
) => {
  if (actorRole !== Role.ADMIN && actorRole !== Role.TRAVEL_AGENT) {
    throw new AppError(403, 'You do not have permission to update booking status');
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: bookingStaffInclude,
  });
};

export const BookingService = {
  createBookingIntoDB,
  updateBookingStatusInDB,
  getMyBookingsFromDB,
  getStaffBookingsFromDB,
  verifyCheckoutSessionForUser,
  handleStripeWebhook,
};
