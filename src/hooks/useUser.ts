'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useDispatch, useSelector } from 'react-redux';

import { onAuthStateChanged, User as FBAuthUserType } from 'firebase/auth';

import { auth } from '@/services/firebase-service/firebase-config';

import { queryClient } from '@/components/tanstack-provider/tanstack-provider';
import { setIsAuthLoading, setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import { UserState, setUser } from '@/store/reducers/user-reducer/user-slice';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';

import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useQuery } from '@tanstack/react-query';

const useUser = (): { user: UserState; fbAuthUser: FBAuthUserType | null } => {
  const dispatch = useDispatch();
  const userState = useSelector(userReducerSelector.getUser);
  const [fbAuthUser, setFBAuthUser] = useState<FBAuthUserType | null>(null);
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);

  const router = useRouter();

  const {
    data: userData,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['get-user-by-id'],
    queryFn: () => userApiService.getUserById(firebaseUserId as string),
    enabled: !!firebaseUserId,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        setFBAuthUser(auth.currentUser);
        setFirebaseUserId(user.uid);

        // If loading, set the loading state
        if (isLoading) {
          dispatch(setIsAuthLoading(true));
          return;
        }

        if (error) {
          dispatch(setIsAuthModalOpen(true));
          return;
        }

        // register case
        if (!userData) {
          dispatch(setIsAuthModalOpen(false));
          return;
        }

        // login case
        if (userData) {
          // Add more data if needed
          const { displayName, username, email, profilePhoto, createdAt } = userData;
          dispatch(
            setUser({
              displayName,
              username,
              email,
              profilePhoto,
              createdAt,
              userId: firebaseUserId,
            })
          );

          dispatch(setIsAuthModalOpen(false));
          dispatch(setIsAuthLoading(false));
        }
      } else {
        dispatch(
          setUser({
            username: '',
            displayName: '',
            email: '',
            profilePhoto: null,
            createdAt: null,
            userId: null,
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
  }, [dispatch, router, userState.username, userData, error, isLoading, firebaseUserId]);

  return { user: userState, fbAuthUser: fbAuthUser };
};

export default useUser;
