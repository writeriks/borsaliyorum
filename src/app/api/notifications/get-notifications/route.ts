import prisma from '@/services/prisma-service/prisma-client';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { Notification, NotificationType, User } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = (await verifyUserInRoute(request)) as User;

    const notifications: Notification[] = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        post: {
          include: {
            user: true,
          },
        },
        comment: {
          include: {
            user: true,
          },
        },
      },
    });

    const grouped: { [key: string]: { mergedNotifications: Notification[] } } = {};

    notifications.forEach(notification => {
      const key = notification.type;

      if (
        key === NotificationType.COMMENT ||
        key === NotificationType.LIKE ||
        key === NotificationType.MENTION
      ) {
        if (!grouped[key]) {
          grouped[key] = { mergedNotifications: [] };
        }
        grouped[key].mergedNotifications.push(notification);
      } else {
        grouped[notification.notificationId] = { mergedNotifications: [notification] };
      }
    });

    const newNotifications = Object.values(grouped);

    return createResponse(ResponseStatus.OK, newNotifications);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
