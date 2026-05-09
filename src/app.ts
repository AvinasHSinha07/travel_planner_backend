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

const app: Application = express();
app.set('trust proxy', true);

// Middlewares
const envOrigins = process.env.CLIENT_URL?.split(',') || [];
const allowedOrigins = [
  ...envOrigins.map(url => url.trim().replace(/\/$/, '')),
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.error(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://api.dicebear.com", "https://www.google.com", "https://www.transparenttextures.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://localhost:5000", "http://localhost:3000"],
    },
  },
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

// Special case for Stripe webhooks (must be before express.json())
app.use('/api/v1/booking/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security Middlewares
const SELF_ASSIGNABLE_ROLES = new Set(['USER', 'TRAVEL_AGENT']);

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
app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to AI Travel Planner API',
  });
});

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
