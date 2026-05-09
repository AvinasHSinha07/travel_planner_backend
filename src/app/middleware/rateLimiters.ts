import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { Request } from 'express';
import { redis } from '../lib/redis';

const skipOptions = (req: Request) => req.method === 'OPTIONS';

/** Only throttle credential / mutation POSTs — not get-session polling (GET/POST get-session). */
const isAuthSessionRead = (req: Request) => {
  const path = `${req.baseUrl || ''}${req.path || ''}${req.originalUrl || ''}`;
  return path.includes('get-session');
};

const redisSendCommand = async (...args: string[]) => {
  const reply = await redis.call(args[0], ...args.slice(1));
  if (reply === null || reply === undefined) {
    return '';
  }
  return reply as string | number | boolean | (string | number | boolean)[];
};

const authStore = new RedisStore({
  sendCommand: redisSendCommand,
  prefix: 'rl:auth:',
});

const generalStore = new RedisStore({
  sendCommand: redisSendCommand,
  prefix: 'rl:general:',
});

const aiStore = new RedisStore({
  sendCommand: redisSendCommand,
  prefix: 'rl:ai:',
});

const bookingStore = new RedisStore({
  sendCommand: redisSendCommand,
  prefix: 'rl:booking:',
});

/** Tight limit for auth mutations (sign-in, sign-up, etc.); excludes session polling. */
export const authRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipOptions(req) || isAuthSessionRead(req),
  store: authStore,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

/** PRD: 100 requests / 15 min per IP (excluding auth prefix — auth has its own limiter) */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipOptions(req) || req.path.startsWith('/auth'),
  store: generalStore,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

/** PRD: 10 requests / minute per IP (user id not always available pre-auth on /ai/chat) */
export const aiRouteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  store: aiStore,
  message: { success: false, message: 'AI rate limit exceeded, try again in a minute.' },
});

/** PRD: 20 booking writes / 15 min per authenticated user (applied after requireAuth) */
export const bookingCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  store: bookingStore,
  keyGenerator: (req) => (req.user?.id as string) || req.ip || 'anonymous',
  message: { success: false, message: 'Too many booking attempts, please try again later.' },
});
