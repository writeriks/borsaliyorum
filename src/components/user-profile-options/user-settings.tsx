import ThemeModeToggle from '@/components/theme-toggle/theme-toggle';
import { Button } from '@/components/ui/button';
import { Bell, Settings } from 'lucide-react';
import React from 'react';

const UserSettings: React.FC = () => (
  <>
    <Button
      variant='secondary'
      className='w-full justify-start bg-transparent dark:bg-transparent dark:hover:bg-accent'
    >
      <Bell className='mr-2 h-4 w-4' /> Bildirimler
    </Button>
    <Button
      variant='secondary'
      className='w-full justify-start bg-transparent dark:bg-transparent dark:hover:bg-accent'
    >
      <Settings className='mr-2 h-4 w-4' /> Ayarlar
    </Button>
    <ThemeModeToggle />
  </>
);

export default UserSettings;
