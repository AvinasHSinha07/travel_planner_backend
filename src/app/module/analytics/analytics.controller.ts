import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { getDashboardAnalytics } from './analytics.service';

const getDashboard = catchAsync(async (req, res) => {
  const userId = req.user!.id;
  const role = req.user!.role as Role;
  const result = await getDashboardAnalytics(userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Analytics retrieved successfully',
    data: result,
  });
});

export const AnalyticsController = {
  getDashboard,
};
