import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserService } from './user.service';
import { Role } from '@prisma/client';

const getAllUsers = catchAsync(async (req, res) => {
  const q = req.query as {
    search?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: string;
    suspended?: string;
  };
  const result = await UserService.getAllUsersForAdminFromDB({
    search: q.search,
    page: q.page ? Number(q.page) : 1,
    limit: q.limit ? Number(q.limit) : 25,
    sortBy: (q.sortBy as 'createdAt' | 'name' | 'email' | 'role') || 'createdAt',
    sortOrder: (q.sortOrder as 'asc' | 'desc') || 'desc',
    suspended: (q.suspended as 'all' | 'true' | 'false') || 'all',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users retrieved successfully',
    meta: result.meta,
    data: result.items,
  });
});

const updateUserSuspension = catchAsync(async (req, res) => {
  const userId = String(req.params.userId);
  const { isSuspended } = req.body as { isSuspended: boolean };
  const result = await UserService.updateUserSuspensionInDB(userId, isSuspended);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: isSuspended ? 'User suspended' : 'User reinstated',
    data: result,
  });
});

const updateUserRole = catchAsync(async (req, res) => {
  const userId = String(req.params.userId);
  const { role } = req.body as { role: Role };
  const result = await UserService.updateUserRoleInDB(userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User role updated successfully',
    data: result,
  });
});

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
  getAllUsers,
  updateUserRole,
  updateUserSuspension,
  getMyProfile,
  updateMyProfile,
  getDashboardStats,
};
