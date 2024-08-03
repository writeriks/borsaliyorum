import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useDispatch, useSelector } from 'react-redux';

import { onAuthStateChanged, User as FBAuthUserType } from 'firebase/auth';

import { auth } from '@/services/firebase-service/firebase-config';

import { queryClient } from '@/components/tanstack-provider/tanstack-provider';
import { setIsAuthLoading, setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import { UserState, setUser } from '@/store/reducers/user-reducer/user-slice';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';

import { User } from '@/services/firebase-service/types/db-types/user';
import userApiService from '@/services/api-service/user-api-service/user-api-service';

const useUser = (): { user: UserState; fbAuthUser: FBAuthUserType | null } => {
  const dispatch = useDispatch();
  const userState = useSelector(userReducerSelector.getUser);
  const [fbAuthUser, setFBAuthUser] = useState<FBAuthUserType | null>(null);

  const router = useRouter();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        const userData = (await userApiService.getUserById(user.uid)) as User;
        setFBAuthUser(auth.currentUser);
        // register case
        if (!userData) {
          dispatch(setIsAuthModalOpen(false));
          return;
        }

        // login case
        if (userData && !userState.username) {
          // Add more data if needed
          const { displayName, username, email, profilePhoto, userId, createdAt } = userData;
          dispatch(
            setUser({
              displayName,
              username,
              email,
              profilePhoto,
              userId,
              createdAt,
            })
          );

          dispatch(setIsAuthModalOpen(false));
        }
      } else {
        dispatch(
          setUser({
            username: '',
            displayName: '',
            email: '',
            profilePhoto: '',
            userId: '',
            createdAt: Date.now(),
          })
        );
        await queryClient.fetchQuery({
          queryKey: ['logOutUser'],
          queryFn: () => userApiService.logOutUser(),
        });
        router.push('/');
      }

      if (window.location.pathname === '/feed') {
        dispatch(setIsAuthLoading(false));
      }
    });

    return () => unsubscribe();
  }, [dispatch, router, userState.username]);

  return { user: userState, fbAuthUser: fbAuthUser };
};

export default useUser;
