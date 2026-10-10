'use client';

import React, { useEffect } from 'react';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useMutation } from '@tanstack/react-query';
import {
  GroupedNotificationsResponseType,
  NotificationResponse,
} from '@/components/user-notifications/user-notifications-schema';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import Notification from '@/components/user-notifications/notification';
import useUser from '@/hooks/useUser';
import { useTranslations } from 'next-intl';

const UserNotifications = (): React.ReactNode => {
  const [notifications, setNotifications] = React.useState<GroupedNotificationsResponseType>([]);
  const [lastNotificationId, setLastNotificationId] = React.useState<string | number>('');
  const [isRead, setIsRead] = React.useState(false);

  const { currentUser } = useUser();

  const t = useTranslations('notifications');

  const setFetchedNotifications = (data: NotificationResponse): void => {
    if (!data) return;

    const { lastNotificationId: newLastNotificationId, notifications: newNotifications } = data;
    setNotifications(prevNotifications => [...prevNotifications, ...newNotifications]);
    setLastNotificationId(newLastNotificationId);
  };

  const fetchNotifications = async (): Promise<any> => {
    if (lastNotificationId === null) return;

    return userApiService.getUserNotifications(lastNotificationId);
  };

  const mutation = useMutation({
    mutationFn: () => fetchNotifications(),
    onSuccess: (data: NotificationResponse) => setFetchedNotifications(data),
    onError: err => console.log('error', err),
  });

  const readNotificationsMutation = useMutation({
    mutationFn: async () => await userApiService.readAllUserNotifications(),
  });

  useEffect(() => {
    if (!currentUser) return;

    mutation.mutate();

    setIsRead(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (isRead) {
      readNotificationsMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRead]);

  useInfiniteScroll({
    shouldFetchNextPage: !mutation.isPending,
    fetchNextPage: mutation.mutate,
  });

  return (
    <div className='w-full p-2'>
      <h1 className='font-bold text-xl'>{t('notificationsTitle')}</h1>
      {!!notifications?.length &&
        notifications.map(notification => (
          <div key={notification[0].notificationId} className='border-gray-300 rounded p-2 my-2'>
            <Notification notification={notification} />
          </div>
        ))}
      {mutation.isPending && <LoadingSkeleton type={LoadingSkeletons.NOTIFICATION} />}
    </div>
  );
};

export default UserNotifications;
