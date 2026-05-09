import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserService } from './user.service';

const getMyProfile = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await UserService.getMyProfileFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile retrieved successfully',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await UserService.updateMyProfileInDB(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile updated successfully',
    data: result,
  });
});

const getDashboardStats = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const role = req.user?.role as string;
  const result = await UserService.getDashboardStatsFromDB(userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard statistics retrieved successfully',
    data: result,
  });
});

export const UserController = {
  getMyProfile,
  updateMyProfile,
  getDashboardStats,
};
