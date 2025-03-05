import React from 'react';
import { Button } from '@/components/ui/button';

import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@/i18n/routing';
import { Bell, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { useDispatch } from 'react-redux';
import { setHamburgerMenuOpen } from '@/store/reducers/ui-reducer/ui-slice';

const UserSettings: React.FC = () => {
  const t = useTranslations('userProfileOptions.UserSettings');
  const router = useRouter();

  const { data, refetch } = useQuery({
    queryKey: ['get-user-notification-count'],
    queryFn: async () => await userApiService.getUserNotificationCount(),
  });

  const dispatch = useDispatch();

  const notificationCount = data?.total;

  const handleNotificationsClick = (): void => {
    dispatch(setHamburgerMenuOpen(false));
    refetch();
    router.push('/notifications');
  };

  const handleSettingsClick = (): void => {
    dispatch(setHamburgerMenuOpen(false));
    refetch();
    router.push('/settings');
  };

  return (
    <>
      <div className='relative'>
        <Button
          variant='secondary'
          className='w-full justify-start bg-transparent dark:bg-transparent dark:hover:bg-accent'
          onClick={() => handleNotificationsClick()}
        >
          <Bell className='mr-2 h-4 w-4' />
          <span className='relative'>
            {t('notifications')}
            {!!notificationCount && notificationCount > 0 && (
              <Label className='absolute top-[-6px] right-[-20px] px-1.5 py-[9px] bg-destructive rounded-md text-[11px] font-bold max-w-[15px] max-h-[15px] flex items-center justify-center'>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Label>
            )}
          </span>
        </Button>
      </div>
      <Button
        variant='secondary'
        className='w-full justify-start bg-transparent dark:bg-transparent dark:hover:bg-accent'
        onClick={() => handleSettingsClick()}
      >
        <Settings className='mr-2 h-4 w-4' /> {t('settings')}
      </Button>
    </>
  );
};

export default UserSettings;
