import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import firebaseAuthService from '@/services/firebase-service/firebase-auth-service';
import { Label } from '@/components/ui/label';
import useUser from '@/hooks/useUser';
import { AuthModal } from '@/components/auth/auth-modal';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import ThemeModeToggle from '@/components/theme-toggle/theme-toggle';

const UserProfileOptions = (): React.ReactNode => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const user = useUser();

  const logout = async (): Promise<void> => {
    await firebaseAuthService.signOut();
    setIsAuthModalOpen(false);
  };

  const onProfileSelectChange = (value: any): void => {
    console.log(value);
    switch (value) {
      case 'view-profile':
        // TODO: route to profile
        break;
      case 'edit-profile':
        // TODO: route to edit profile
        break;
      case 'logout':
        logout();
        break;
      default:
        break;
    }
  };

  return (
    <div id='user-profile-section' className='flex p-2 flex-col'>
      {user ? (
        <div className='w-full h-full flex flex-col p-1'>
          <div>
            <Select value='' onValueChange={onProfileSelectChange}>
              <SelectTrigger className='w-[180px] hover:bg-secondary border-none text-secondary-foreground dark:bg-transparent dark:hover:bg-secondary'>
                <div className='flex relative left-1'>
                  <User className='mr-2 h-4 w-4' /> Profil
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem className='cursor-pointer' value='view-profile'>
                    Profilini Gör
                  </SelectItem>
                  <SelectItem className='cursor-pointer' value='edit-profile'>
                    Profilini Düzenle
                  </SelectItem>
                  <SelectItem className='cursor-pointer group' value='logout'>
                    <div className='flex text-destructive'>
                      <LogOut className='mr-2 h-4 w-4' />
                      Çıkış Yap
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <div>
              <Button
                variant='secondary'
                className='bg-transparent dark:bg-transparent dark:hover:bg-secondary'
              >
                <Bell className='mr-2 h-4 w-4' /> Bildirimler
              </Button>
            </div>
            <div>
              <Button
                variant='secondary'
                className='bg-transparent dark:bg-transparent dark:hover:bg-secondary'
              >
                <Settings className='mr-2 h-4 w-4' /> Ayarlar
              </Button>
            </div>
            <ThemeModeToggle />
          </div>
        </div>
      ) : (
        <div className='flex flex-col w-full h-full justify-center items-center'>
          <Label className='capitalize m-1'>Hemen şimdi kayıt ol</Label>
          {!user && (
            <Button
              className='w-48 m-1 text-lg font-medium bg-blue-600 rounded-full text-white'
              onClick={() => setIsAuthModalOpen(true)}
            >
              Giriş Yap
            </Button>
          )}
        </div>
      )}

      <AuthModal
        isOpen={!Boolean(user) && isAuthModalOpen}
        onAuthModalOpenChange={() => setIsAuthModalOpen(!isAuthModalOpen)}
      />
    </div>
  );
};

export default UserProfileOptions;
