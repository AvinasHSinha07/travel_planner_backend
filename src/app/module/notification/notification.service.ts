import { prisma } from '../../lib/prisma';
import { NotificationType } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errorHelpers/AppError';

const createNotificationIntoDB = async (payload: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}) => {
  const result = await prisma.notification.create({
    data: payload,
  });
  return result;
};

const getMyNotificationsFromDB = async (userId: string) => {
  const result = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return result;
};

const markAsReadInDB = async (id: string, userId: string) => {
  const updated = await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
  if (updated.count === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }
  return prisma.notification.findFirst({ where: { id, userId } });
};

const markAllAsReadInDB = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { success: true as const };
};

const deleteNotificationInDB = async (id: string, userId: string) => {
  const deleted = await prisma.notification.deleteMany({
    where: { id, userId },
  });
  if (deleted.count === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }
  return { success: true as const };
};

export const NotificationService = {
  createNotificationIntoDB,
  getMyNotificationsFromDB,
  markAsReadInDB,
  markAllAsReadInDB,
  deleteNotificationInDB,
};
