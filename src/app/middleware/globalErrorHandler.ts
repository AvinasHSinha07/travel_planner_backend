import * as Sentry from '@sentry/node';
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import AppError from '../errorHelpers/AppError';

const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong!';
  let errorSources = [
    {
      path: '',
      message: 'Something went wrong',
    },
  ];

  if (env.SENTRY_DSN && statusCode >= 500) {
    Sentry.captureException(err);
  }

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errorSources = err.issues.map((issue) => ({
      path: issue.path[issue.path.length - 1] as string,
      message: issue.message,
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [{ path: '', message: err.message }];
  } else if (err.name === 'PrismaClientKnownRequestError') {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      statusCode = 409;
      message = 'A record with this value already exists';
    } else {
      statusCode = 400;
      message = 'Database Error';
    }
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: env.NODE_ENV === 'development' ? err?.stack : null,
  });
};

export default globalErrorHandler;
