'use client';

import UserAvatar from '@/components/user-avatar/user-avatar';
import notificationService from '@/components/user-notifications/notification-service';
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

  const buildNotificationText = (): string | undefined => {
    const displayName = notification[0].fromUser.displayName;
    const notificationType = notification[0].type;

    switch (notificationType) {
      case NotificationType.FOLLOW:
        return t('followedBy', { userDisplayName: displayName });
      case NotificationType.LIKE:
        return notificationService.getLikeNotificationText(notification, displayName, t);
      case NotificationType.COMMENT:
        return notificationService.getCommentNotificationText(notification, displayName, t);
      case NotificationType.MENTION:
        return notificationService.getMentionNotificationText(notification, displayName, t);
      default:
        break;
    }
  };

  const renderNotification = (): React.ReactNode => {
    return (
      <div
        className='flex items-center cursor-pointer'
        onClick={() => notificationService.handleNotificationClick(notification, router)}
      >
        <UserAvatar
          user={notification[0].fromUser}
          onUserAvatarClick={() => router.push(`/users/${notification[0].fromUser.username}`)}
        />
        <p className={cn('ml-2', notification[0].read ? 'font-normal' : 'font-bold')}>
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
