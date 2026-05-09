import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TravelPreferenceService } from './travelPreference.service';

const getMyPreferences = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await TravelPreferenceService.getMyPreferencesFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Preferences retrieved successfully',
    data: result,
  });
});

const updateMyPreferences = catchAsync(async (req, res) => {
  const userId = req.user?.id as string;
  const result = await TravelPreferenceService.updateMyPreferencesInDB(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Preferences updated successfully',
    data: result,
  });
});

export const TravelPreferenceController = {
  getMyPreferences,
  updateMyPreferences,
};
