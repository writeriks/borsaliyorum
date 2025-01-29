import { Button } from '@/components/ui/button';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useQuery } from '@tanstack/react-query';
import { Bell, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

const UserSettings: React.FC = () => {
  const t = useTranslations('userProfileOptions.UserSettings');

  const { data: notifications } = useQuery({
    queryKey: ['get-notifications'],
    queryFn: async () => await userApiService.getUserNotifications(),
  });
  console.log('🚀 ~ notifications:', notifications);

  return (
    <>
      <Button
        variant='secondary'
        className='w-full justify-start bg-transparent dark:bg-transparent dark:hover:bg-accent'
      >
        <Bell className='mr-2 h-4 w-4' /> {t('notifications')}
      </Button>
      <Button
        variant='secondary'
        className='w-full justify-start bg-transparent dark:bg-transparent dark:hover:bg-accent'
      >
        <Settings className='mr-2 h-4 w-4' /> {t('settings')}
      </Button>
    </>
  );
};

export default UserSettings;
