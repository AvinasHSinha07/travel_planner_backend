import { prisma } from '../../lib/prisma';
import { NotificationType } from '@prisma/client';

const createNotificationIntoDB = async (payload: { userId: string; type: NotificationType; title: string; message: string }) => {
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

const markAsReadInDB = async (id: string) => {
  const result = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  return result;
};

export const NotificationService = {
  createNotificationIntoDB,
  getMyNotificationsFromDB,
  markAsReadInDB,
};
