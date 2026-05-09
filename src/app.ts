import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import notFound from './app/middleware/notFound';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import router from './app/routes';

import pino from 'pino-http';
import { toNodeHandler } from "better-auth/node";
import { auth } from './app/lib/auth';
import { env } from './app/config/env';
import { authRouteLimiter, generalApiLimiter } from './app/middleware/rateLimiters';
import { BookingController } from './app/module/booking/booking.controller';

const app: Application = express();
app.set('trust proxy', true);

// Middlewares
const envOrigins = process.env.CLIENT_URL?.split(',') || [];
const allowedOrigins = [
  ...envOrigins.map(url => url.trim().replace(/\/$/, '')),
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost variations in development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.error(`[CORS] Blocked request from origin: ${origin}`);
      console.error(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie', 'Authorization']
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://api.dicebear.com", "https://www.google.com", "https://www.transparenttextures.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://localhost:5000", "http://localhost:3000", "http://127.0.0.1:5000", "http://127.0.0.1:3000"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(cookieParser());
app.use(pino({
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname,req,res', // Hide massive objects for cleaner output
    }
  } : undefined
}));

// Stripe needs the raw body for signature verification (must run before express.json)
app.post(
  '/api/v1/booking/webhook',
  express.raw({ type: 'application/json' }),
  BookingController.stripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security Middlewares
const SELF_ASSIGNABLE_ROLES = new Set(['USER', 'TRAVEL_AGENT']);

app.use('/api/v1/auth', authRouteLimiter);
app.use('/api/v1/auth', (req, res, next) => {
  if (req.method !== 'POST' || !req.path.includes('sign-up')) {
    return next();
  }

  const role = req.body?.role;
  // If role is provided but not in the self-assignable set, fallback to USER
  if (typeof role === 'string' && !SELF_ASSIGNABLE_ROLES.has(role)) {
    req.body.role = 'USER';
  }

  return next();
});
app.all("/api/v1/auth/*path", toNodeHandler(auth));

// Routes
app.use('/api/v1', generalApiLimiter, router);

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to AI Travel Planner API',
  });
});

// Debug endpoint to check auth status
app.get('/api/v1/debug/auth', async (req: Request, res: Response) => {
  const { fromNodeHeaders } = await import('better-auth/node');
  const { auth } = await import('./app/lib/auth');
  
  console.log('[DEBUG] Cookies received:', req.headers.cookie);
  
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers)
  });
  
  res.json({
    hasSession: !!session,
    user: session?.user || null,
    cookies: req.headers.cookie || 'No cookies'
  });
});

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
