import React from 'react';
import firebaseAuthService from '@/services/firebase-service/firebase-auth-service';
import { LogOut } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { useDispatch } from 'react-redux';

import UserAvatar from '@/components/user-avatar/user-avatar';
import { setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import UserSettings from '@/components/user-profile-options/user-settings';
import TooltipWithEllipsis from '@/components/tooltip-with-ellipsis/tooltip-with-ellipsis';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import useUser from '@/hooks/useUser';
import LoginContainer from '@/components/user-profile-options/login-container';

const UserProfileOptions = (): React.ReactNode => {
  const dispatch = useDispatch();
  const { currentUser, isLoading } = useUser();

  const t = useTranslations('userProfileOptions.UserProfileOptions');

  const router = useRouter();

  const logout = async (): Promise<void> => {
    await firebaseAuthService.signOut();
    dispatch(setIsAuthModalOpen(false));
  };

  const onProfileSelectChange = (value: string): void => {
    switch (value) {
      case 'view-profile':
        router.push(`/users/${currentUser?.username}`);
        break;
      case 'edit-profile':
        router.push(`/edit-profile`);
        break;
      case 'logout':
        logout();
        break;
      default:
        break;
    }
  };

  return isLoading ? (
    <LoadingSkeleton type={LoadingSkeletons.USER_PROFILE} />
  ) : (
    <div
      id='user-profile-section'
      className='flex flex-col top-[60px] h-[170px] sticky bg-background z-50'
    >
      {currentUser?.username ? (
        <div className='w-full h-full flex flex-col p-1'>
          <div>
            <Select onValueChange={onProfileSelectChange}>
              <SelectTrigger className='w-full hover:bg-accent border-none h-[45px] text-secondary-foreground dark:bg-transparent dark:hover:bg-accent'>
                <div className='flex items-center'>
                  <UserAvatar
                    user={{
                      profilePhoto: currentUser?.profilePhoto ?? '',
                      displayName: currentUser?.displayName ?? '',
                      username: currentUser?.username ?? '',
                    }}
                  />
                  <div className='ml-2 flex flex-col items-start break-words'>
                    <TooltipWithEllipsis
                      tooltipText={currentUser?.displayName ?? ''}
                      className='text-sm'
                      tooltipSide='bottom'
                    />
                    <TooltipWithEllipsis
                      tooltipText={currentUser?.username ?? ''}
                      className='text-xs'
                      tooltipSide='bottom'
                    />
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem className='cursor-pointer' value='view-profile'>
                    {t('viewProfile')}
                  </SelectItem>
                  <SelectItem className='cursor-pointer' value='edit-profile'>
                    {t('editProfile')}
                  </SelectItem>
                  <SelectItem className='cursor-pointer group' value='logout'>
                    <div className='flex text-destructive'>
                      <LogOut className='mr-2 h-4 w-4' />
                      {t('logout')}
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <UserSettings />
          </div>
        </div>
      ) : (
        <LoginContainer setLoginModalOpen={() => dispatch(setIsAuthModalOpen(true))} />
      )}
    </div>
  );
};

export default UserProfileOptions;
