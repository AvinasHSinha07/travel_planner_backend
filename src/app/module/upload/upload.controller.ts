import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { uploadImageBuffer } from '../../utils/cloudinary';
import { isCloudinaryConfigured } from '../../config/env';
import AppError from '../../errorHelpers/AppError';

const uploadImage = catchAsync(async (req, res) => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(httpStatus.SERVICE_UNAVAILABLE, 'Image uploads are not configured (Cloudinary).');
  }

  const file = req.file;
  if (!file?.buffer) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Missing image file (field name: image).');
  }

  const folder = typeof req.body?.folder === 'string' && req.body.folder.trim() ? req.body.folder.trim() : 'misc';

  const { url, publicId } = await uploadImageBuffer(file.buffer, folder);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Image uploaded',
    data: { url, publicId },
  });
});

export const UploadController = {
  uploadImage,
};
