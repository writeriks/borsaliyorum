'use client';

import React from 'react';
import Notification from '@/components/user-notifications/notification';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useQuery } from '@tanstack/react-query';

const UserNotifications = (): React.ReactNode => {
  const { data: notifications } = useQuery({
    queryKey: ['get-notifications'],
    queryFn: async () => await userApiService.getUserNotifications(),
  });

  return (
    <div className='w-full p-2'>
      <h1 className='font-bold text-xl'>Bildirimler</h1>
      {notifications?.length &&
        notifications.map(notification => (
          <div key={notification[0].notificationId} className='border-gray-300 rounded p-2 my-2'>
            <Notification notification={notification} />
          </div>
        ))}
    </div>
  );
};

export default UserNotifications;
