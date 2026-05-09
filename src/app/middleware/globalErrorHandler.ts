import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

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

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errorSources = err.issues.map((issue) => ({
      path: issue.path[issue.path.length - 1] as string,
      message: issue.message,
    }));
  } else if (err.name === 'PrismaClientKnownRequestError') {
     // Handle Prisma specific errors if needed
     statusCode = 400;
     message = 'Database Error';
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: env.NODE_ENV === 'development' ? err?.stack : null,
  });
};

export default globalErrorHandler;
