import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ActivityService } from './activity.service';

const createActivity = catchAsync(async (req, res) => {
  const result = await ActivityService.createActivityIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Activity created successfully',
    data: result,
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

export const ActivityController = {
  createActivity,
  getDestinationActivities,
};
