import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { BookingService } from './booking.service';

const createBooking = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await BookingService.createBookingIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking initiated successfully',
    data: result,
  });
});

const updateBookingStatus = catchAsync(async (req, res) => {
  const role = req.user?.role as Role;
  const bookingId = String(req.params.id);
  const { status } = req.body;
  const result = await BookingService.updateBookingStatusInDB(bookingId, status, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking status updated',
    data: result,
  });
});

const listBookings = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const role = req.user?.role as Role;

  if (role === Role.ADMIN || role === Role.TRAVEL_AGENT) {
    const q = req.query as {
      status?: string;
      type?: string;
      page?: string;
      limit?: string;
    };
    const page = q.page ? Number(q.page) : 1;
    const limit = q.limit ? Math.min(Number(q.limit), 100) : 25;
    const result = await BookingService.getStaffBookingsFromDB({
      status: q.status as any,
      type: q.type as any,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 25,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Bookings retrieved successfully',
      data: result,
    });
    return;
  }

  const result = await BookingService.getMyBookingsFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bookings retrieved successfully',
    data: result,
  });
});

const verifyCheckout = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const role = req.user?.role as Role;
  const sessionId = String(req.query.sessionId);

  const result = await BookingService.verifyCheckoutSessionForUser(userId, sessionId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checkout session verified',
    data: result,
  });
});

const stripeWebhook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const rawBody = req.body as Buffer;
  await BookingService.handleStripeWebhook(rawBody, sig);
  res.status(200).send();
});

export const BookingController = {
  createBooking,
  updateBookingStatus,
  listBookings,
  verifyCheckout,
  stripeWebhook,
};
