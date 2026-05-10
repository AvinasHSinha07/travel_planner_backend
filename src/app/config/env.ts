import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  /** Number of reverse-proxy hops (0 = off). Unset: dev=false, prod=1. See express-rate-limit trust proxy docs. */
  TRUST_PROXY_HOPS: z.string().optional(),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().default('http://localhost:5000'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN: z.string().optional(),
  BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

const parsed = _env.data;
const cloudinarySetCount = [
  parsed.CLOUDINARY_CLOUD_NAME,
  parsed.CLOUDINARY_API_KEY,
  parsed.CLOUDINARY_API_SECRET,
].filter((v) => v != null && String(v).trim() !== '').length;

if (cloudinarySetCount !== 0 && cloudinarySetCount !== 3) {
  console.error(
    '❌ Cloudinary: set all of CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, or omit all for dev without uploads.',
  );
  throw new Error('Invalid Cloudinary environment variables');
}

export const env = parsed;

/** Express `trust proxy` and express-rate-limit `trustProxy` (boolean `true` is rejected by rate-limit v8). */
function resolveTrustProxyHops(): number | false {
  const raw = parsed.TRUST_PROXY_HOPS?.trim();
  if (raw !== undefined && raw !== '') {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return false;
    return Math.min(5, Math.floor(n));
  }
  return parsed.NODE_ENV === 'production' ? 1 : false;
}

export const trustProxyExpress = resolveTrustProxyHops();
export const trustProxyForRateLimit: number | false = trustProxyExpress;

export const isCloudinaryConfigured = (): boolean => cloudinarySetCount === 3;
