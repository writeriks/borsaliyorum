import {
  getGroupedNotifications,
  getUnreadNotificationsCount,
} from '@/services/notifications-service/notifications-service';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { User } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = (await verifyUserInRoute(request)) as User;

    const { searchParams } = new URL(request.url);
    const lastNotificationId = parseInt(searchParams.get('lastNotificationId') ?? '') || 0;

    const unreadNotificationCount = await getUnreadNotificationsCount(userId);

    const newNotifications = await getGroupedNotifications(
      userId,
      lastNotificationId,
      unreadNotificationCount
    );

    const lastNotificationGroup =
      newNotifications.length > 0 ? newNotifications[newNotifications.length - 1] : null;
    const newLastNotificationId =
      lastNotificationGroup && lastNotificationGroup?.length > 0
        ? lastNotificationGroup[lastNotificationGroup?.length - 1].notificationId
        : null;

    return createResponse(ResponseStatus.OK, {
      notifications: newNotifications,
      lastNotificationId: newLastNotificationId,
    });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
