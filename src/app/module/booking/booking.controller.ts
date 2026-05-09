import httpStatus from 'http-status';
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

const getMyBookings = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await BookingService.getMyBookingsFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bookings retrieved successfully',
    data: result,
  });
});

const webhook = catchAsync(async (req, res) => {
    await BookingService.handleStripeWebhook(req.body);
    res.status(200).send();
});

export const BookingController = {
  createBooking,
  getMyBookings,
  webhook
};
