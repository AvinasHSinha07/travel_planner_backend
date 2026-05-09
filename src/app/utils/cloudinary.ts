import { v2 as cloudinary } from 'cloudinary';
import { env, isCloudinaryConfigured } from '../config/env';

export function configureCloudinary(): void {
  if (!isCloudinaryConfigured()) return;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadImageBuffer(buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> {
  configureCloudinary();
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `travel-planner/${folder}`,
        resource_type: 'image',
      },
      (err, result) => {
        if (err || !result?.secure_url) {
          reject(err ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}
