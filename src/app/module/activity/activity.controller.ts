import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ActivityService } from './activity.service';

const createActivity = catchAsync(async (req, res) => {
  const result = await ActivityService.createActivityIntoDB(req.body, req.user?.id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Activity created successfully',
    data: result,
  });
});

const listActivities = catchAsync(async (req, res) => {
  const q = req.query as {
    destinationId?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
  };
  const result = await ActivityService.listActivitiesFromDB({
    destinationId: q.destinationId,
    page: q.page ? Number(q.page) : 1,
    limit: q.limit ? Number(q.limit) : 20,
    sortBy: (q.sortBy as 'name' | 'price' | 'createdAt' | 'rating' | 'type') || 'createdAt',
    sortOrder: (q.sortOrder as 'asc' | 'desc') || 'desc',
    search: q.search,
  }, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Activities retrieved successfully',
    meta: result.meta,
    data: result.items,
  });
});

const getDestinationActivities = catchAsync(async (req, res) => {
  const { destinationId } = req.params;
  const result = await ActivityService.getDestinationActivitiesFromDB(destinationId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Activities retrieved successfully',
    data: result,
  });
});

const updateActivity = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ActivityService.updateActivityInDB(id as string, req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Activity updated successfully',
    data: result,
  });
});

const deleteActivity = catchAsync(async (req, res) => {
  const { id } = req.params;
  await ActivityService.deleteActivityFromDB(id as string, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Activity deleted successfully',
    data: null,
  });
});

export const ActivityController = {
  createActivity,
  listActivities,
  getDestinationActivities,
  updateActivity,
  deleteActivity,
};
