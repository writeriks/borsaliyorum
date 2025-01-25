import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/routing';
import { Bell, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

const UserSettings: React.FC = () => {
  const t = useTranslations('userProfileOptions.UserSettings');
  const router = useRouter();

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
        onClick={() => router.push('/settings')}
      >
        <Settings className='mr-2 h-4 w-4' /> {t('settings')}
      </Button>
    </>
  );
};

export default UserSettings;
