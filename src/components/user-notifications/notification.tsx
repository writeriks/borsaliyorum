'use client';

import UserAvatar from '@/components/user-avatar/user-avatar';
import { MultipleNotificationsWithUserPostAndCommentType } from '@/components/user-notifications/user-notifications-schema';
import { useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import React from 'react';

interface NotificationProps {
  notification: MultipleNotificationsWithUserPostAndCommentType;
}

const Notification: React.FC<NotificationProps> = ({ notification }) => {
  const router = useRouter();
  const buildNotificationText = (): string => {
    if (notification.length > 1) {
      const displayName = notification[0].fromUser.displayName;
      return notification[0].content.replace(
        displayName,
        `${displayName} ve ${notification.length - 1} kişi daha`
      );
    }
    return notification[0].content;
  };

  const renderNotification = (): React.ReactNode => {
    return (
      <div className='flex items-center'>
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
