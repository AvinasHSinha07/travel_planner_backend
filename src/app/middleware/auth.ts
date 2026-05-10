import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { auth } from '../lib/auth';
import AppError from '../errorHelpers/AppError';
import catchAsync from '../utils/catchAsync';
import { Role } from '@prisma/client';
import { fromNodeHeaders } from 'better-auth/node';
import { prisma } from '../lib/prisma';

const requireAuth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[AUTH]',
        req.method,
        req.originalUrl,
        session?.user?.id
          ? `user=${session.user.id} role=${(session.user as { role?: string }).role}`
          : 'no session',
      );
    }

    if (!session) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    const user = session.user;

    if (requiredRoles.length && !requiredRoles.includes(user.role as Role)) {
      throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to access this resource');
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true, isSuspended: true },
    });

    if (!dbUser) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    if (dbUser.isSuspended) {
      throw new AppError(httpStatus.FORBIDDEN, 'Your account has been suspended. Contact support.');
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as Role,
    };
    next();
  });
};

export const optionalAuth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (session) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, role: true, isSuspended: true },
    });

    if (dbUser && !dbUser.isSuspended) {
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role as Role,
      };
    }
  }
  next();
});

export default requireAuth;
