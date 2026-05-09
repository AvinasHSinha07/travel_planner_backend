import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { auth } from '../lib/auth';
import AppError from '../errorHelpers/AppError';
import catchAsync from '../utils/catchAsync';
import { Role } from '@prisma/client';

const requireAuth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
        headers: req.headers as any
    });

    if (!session) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    const user = session.user;

    if (requiredRoles.length && !requiredRoles.includes(user.role as Role)) {
      throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to access this resource');
    }

    req.user = user as any; // Cast from BetterAuth user to our Express.User
    next();
  });
};

export default requireAuth;
