import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useDispatch, useSelector } from 'react-redux';

import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@/services/firebase-service/firebase-config';

import { queryClient } from '@/components/tanstack-provider/tanstack-provider';
import { setIsAuthLoading, setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import { UserState, setUser } from '@/store/reducers/user-reducer/user-slice';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';

import { User } from '@/services/firebase-service/types/db-types/user';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { Timestamp } from 'firebase/firestore';

const useUser = (): UserState => {
  const dispatch = useDispatch();
  const userState = useSelector(userReducerSelector.getUser);

  const router = useRouter();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        const userData = (await userApiService.getUserById(user.uid)) as User;

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
            createdAt: Timestamp.now(),
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

  return userState;
};

export default useUser;
