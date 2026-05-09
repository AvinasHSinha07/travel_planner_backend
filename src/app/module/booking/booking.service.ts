import { BookingStatus, BookingType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { stripe } from '../../utils/stripe';

const createBookingIntoDB = async (userId: string, payload: any) => {
  const { tripId, type, totalAmount } = payload;

  const booking = await prisma.booking.create({
    data: {
      userId,
      tripId,
      type,
      totalAmount,
      status: BookingStatus.PENDING,
    },
  });

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
    success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    metadata: {
      bookingId: booking.id,
    },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      stripeSessionId: session.id,
    },
  });

  return session.url;
};

const getMyBookingsFromDB = async (userId: string) => {
  const result = await prisma.booking.findMany({
    where: { userId },
    include: {
      trip: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return result;
};

const handleStripeWebhook = async (payload: any) => {
    // Basic implementation - in production, verify signature
    const event = payload;

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const bookingId = session.metadata.bookingId;

        await prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: BookingStatus.CONFIRMED,
                stripePaymentIntentId: session.payment_intent as string,
            }
        });
    }
};

export const BookingService = {
  createBookingIntoDB,
  getMyBookingsFromDB,
  handleStripeWebhook
};
