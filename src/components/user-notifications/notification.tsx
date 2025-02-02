'use client';

import UserAvatar from '@/components/user-avatar/user-avatar';
import { MultipleNotificationsWithUserPostAndCommentType } from '@/components/user-notifications/user-notifications-schema';
import { useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { NotificationType } from '@prisma/client';
import { useTranslations } from 'next-intl';
import React from 'react';

interface NotificationProps {
  notification: MultipleNotificationsWithUserPostAndCommentType;
}

const Notification: React.FC<NotificationProps> = ({ notification }) => {
  const t = useTranslations('notifications');
  const router = useRouter();

  const getLikeNotificationText = (displayName: string): string | undefined => {
    if (notification[0].postId && notification[0].commentId) {
      return notification.length > 1
        ? t('likedCommentMultiple', {
            userDisplayName: displayName,
            count: notification.length - 1,
          })
        : t('likedCommentSingle', { userDisplayName: displayName });
    } else if (notification[0].postId) {
      return notification.length > 1
        ? t('likedPostMultiple', { userDisplayName: displayName, count: notification.length - 1 })
        : t('likedPostSingle', { userDisplayName: displayName });
    }
  };

  const getMentionNotificationText = (displayName: string): string | undefined => {
    if (notification[0].postId && notification[0].commentId) {
      return notification.length > 1
        ? t('mentionedInCommentMultiple', {
            userDisplayName: displayName,
            count: notification.length - 1,
          })
        : t('mentionedInCommentSingle', { userDisplayName: displayName });
    } else if (notification[0].postId) {
      return notification.length > 1
        ? t('mentionedInPostMultiple', {
            userDisplayName: displayName,
            count: notification.length - 1,
          })
        : t('mentionedInPostSingle', { userDisplayName: displayName });
    }
  };

  const getCommentNotificationText = (displayName: string): string | undefined => {
    return notification.length > 1
      ? t('commentedMultiple', { userDisplayName: displayName, count: notification.length - 1 })
      : t('commentedSingle', { userDisplayName: displayName });
  };

  const buildNotificationText = (): string | undefined => {
    const displayName = notification[0].fromUser.displayName;
    const notificationType = notification[0].type;

    switch (notificationType) {
      case NotificationType.FOLLOW:
        return t('followedBy', { userDisplayName: displayName });
      case NotificationType.LIKE:
        return getLikeNotificationText(displayName);
      case NotificationType.COMMENT:
        return getCommentNotificationText(displayName);
      case NotificationType.MENTION:
        return getMentionNotificationText(displayName);
      default:
        break;
    }
  };

  const renderNotification = (): React.ReactNode => {
    return (
      <div className='flex items-center cursor-pointer'>
        <UserAvatar
          user={notification[0].fromUser}
          onUserAvatarClick={() => router.push(`/users/${notification[0].fromUser.username}`)}
        />
        <p className={cn('ml-2', !notification[0].read ? 'font-bold' : 'font-normal')}>
          {buildNotificationText()}
        </p>
      </div>
    );
  };

  return (
    <div key={notification[0].notificationId} className='border-gray-300 rounded'>
      {renderNotification()}
      <div className='border-b flex mt-4'></div>
    </div>
  );
};

export default Notification;
