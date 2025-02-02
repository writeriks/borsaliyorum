import {
  MultipleNotificationsWithUserPostAndCommentType,
  GroupedNotificationsResponseType,
} from '@/components/user-notifications/user-notifications-schema';
import prisma from '@/services/prisma-service/prisma-client';
import { NotificationType } from '@prisma/client';

/**
 * Groups notifications by post, comment, and user.
 * @param notifications - The notifications to group.
 * @returns The grouped notifications.
 */
export const parseNotificationsToGroup = (
  notifications: MultipleNotificationsWithUserPostAndCommentType
): GroupedNotificationsResponseType => {
  const groupedMap = new Map<string, MultipleNotificationsWithUserPostAndCommentType>();

  notifications.forEach(notification => {
    let key = '';
    if (notification.type === NotificationType.FOLLOW) {
      // Separate follow notifications
      key = `${notification.type}-${notification.fromUserId}`;
    } else if (notification.commentId && notification.type === NotificationType.LIKE) {
      // Group like notifications by post and comment
      key = `${notification.type}-${notification.postId}-${notification.commentId}`;
    } else {
      // Group other notifications by post
      key = `${notification.type}-${notification.postId}`;
    }

    if (!groupedMap.has(key)) {
      groupedMap.set(key, []);
    }
    groupedMap.get(key)!.push(notification);
  });

  const newNotifications = Array.from(groupedMap.values());

  return newNotifications;
};

/**
 * Retrieves the number of unread notifications for a user.
 * @param userId - The ID of the user.
 * @returns The number of unread notifications.
 */
export const getUnreadNotificationsCount = async (userId: number): Promise<number> => {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
};

/**
 * Retrieves unread notifications for a user.
 * @param userId - The ID of the user.
 * @returns The unread notifications.
 */
export const getUnreadNotifications = async (
  userId: number
): Promise<GroupedNotificationsResponseType> => {
  const notifications: MultipleNotificationsWithUserPostAndCommentType =
    await prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        post: {
          select: {
            postId: true,
            content: true,
            createdAt: true,
          },
        },
        comment: {
          select: {
            commentId: true,
            content: true,
            createdAt: true,
          },
        },
        fromUser: {
          select: {
            username: true,
            firebaseUserId: true,
            displayName: true,
            profilePhoto: true,
          },
        },
      },
    });
  return parseNotificationsToGroup(notifications);
};

/**
 * Retrieves grouped notifications for a user.
 * @param userId - The ID of the user.
 * @param lastNotificationId - The last notification ID.
 * @param pageSize - The number of notifications to retrieve.
 * @returns The grouped notifications.
 */
export const getGroupedNotifications = async (
  userId: number,
  lastNotificationId: number,
  pageSize = 20
): Promise<GroupedNotificationsResponseType> => {
  const notifications: MultipleNotificationsWithUserPostAndCommentType =
    await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: pageSize,
      cursor: lastNotificationId ? { notificationId: lastNotificationId } : undefined,
      skip: lastNotificationId ? 1 : 0,
      include: {
        post: {
          select: {
            postId: true,
            content: true,
            createdAt: true,
          },
        },
        comment: {
          select: {
            commentId: true,
            content: true,
            createdAt: true,
          },
        },
        fromUser: {
          select: {
            username: true,
            firebaseUserId: true,
            displayName: true,
            profilePhoto: true,
          },
        },
      },
    });

  return parseNotificationsToGroup(notifications);
};
