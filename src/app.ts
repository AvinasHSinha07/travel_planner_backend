import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import notFound from './app/middleware/notFound';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import router from './app/routes';

import pino from 'pino-http';

const app: Application = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());
app.use(cookieParser());
app.use(pino());

// Special case for Stripe webhooks (must be before express.json())
app.use('/api/v1/booking/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

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
