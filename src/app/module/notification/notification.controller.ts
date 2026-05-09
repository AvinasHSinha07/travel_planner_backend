import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { NotificationService } from './notification.service';

const getMyNotifications = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await NotificationService.getMyNotificationsFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NotificationService.markAsReadInDB(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
};
