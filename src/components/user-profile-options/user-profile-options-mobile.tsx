import React from 'react';

import { Button } from '@/components/ui/button';
import firebaseAuthService from '@/services/firebase-service/firebase-auth-service';
import { LogOut, UserCog } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import uiReducerSelector from '@/store/reducers/ui-reducer/ui-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';
import { setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import LoginContainer from '@/components/user-profile-options/login-container';
import UserSettings from '@/components/user-profile-options/user-settings';

const UserProfileOptionsMobile = (): React.ReactNode => {
  const dispatch = useDispatch();
  const user = useSelector(userReducerSelector.getUser);
  const isAuthLoading = useSelector(uiReducerSelector.getIsAuthLoading);

  const logout = async (): Promise<void> => {
    await firebaseAuthService.signOut();
    dispatch(setIsAuthModalOpen(false));
  };

  return isAuthLoading ? (
    <LoadingSkeleton type={LoadingSkeletons.USER_PROFILE} />
  ) : (
    <div id='user-profile-section' className='flex flex-col top-[60px] h-[170px] sticky'>
      {user.username ? (
        <div className='w-full h-full flex flex-col p-1'>
          <div>
            <div className='flex'>
              <UserAvatar
                user={{
                  profilePhoto: user.profilePhoto ?? '',
                  displayName: user.displayName,
                  username: user.username,
                }}
              />
              <div className='ml-2 flex flex-col items-start'>
                <span className='text-sm'>{user.displayName}</span>
                <span className='text-xs'>{user.username}</span>
              </div>
            </div>

            <Button
              variant='secondary'
              className='w-full justify-start bg-transparent dark:bg-transparent dark:hover:bg-accent'
            >
              <UserCog className='mr-2 h-4 w-4' /> Profilini Düzenle
            </Button>
            <UserSettings />
            <Button
              onClick={() => logout()}
              className='w-full justify-start bg-transparent dark:bg-transparent dark:hover:bg-accent flex text-destructive'
            >
              <LogOut className='mr-2 h-4 w-4' />
              Çıkış Yap
            </Button>
          </div>
        </div>
      ) : (
        <LoginContainer setLoginModalOpen={() => dispatch(setIsAuthModalOpen(true))} />
      )}
    </div>
  );
};

export default UserProfileOptionsMobile;
