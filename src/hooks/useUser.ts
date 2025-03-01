'use client';

import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { onAuthStateChanged, User as FBAuthUserType } from 'firebase/auth';

import { auth } from '@/services/firebase-service/firebase-config';

import { queryClient } from '@/components/tanstack-provider/tanstack-provider';
import { setIsAuthLoading, setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import { UserState, setUser } from '@/store/reducers/user-reducer/user-slice';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';

import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@/i18n/routing';
import { User } from '@prisma/client';

const useUser = (): {
  user: UserState;
  fbAuthUser: FBAuthUserType | null;
  currentUser: Partial<User> | null;
  isLoadingUser: boolean;
} => {
  const dispatch = useDispatch();
  const userState = useSelector(userReducerSelector.getUser);
  const [fbAuthUser, setFBAuthUser] = useState<FBAuthUserType | null>(null);
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<Partial<User | null>>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

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

  const { refetch } = useQuery({
    queryKey: ['validate-user'],
    queryFn: () => userApiService.validateUser(fbAuthUser as FBAuthUserType),
    enabled: false,
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
          setCurrentUser(userData);

          dispatch(setIsAuthModalOpen(false));
          dispatch(setIsAuthLoading(false));
          setIsLoadingUser(false);
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

        setCurrentUser(null);

        dispatch(setIsAuthModalOpen(false));
        dispatch(setIsAuthLoading(false));
        setIsLoadingUser(false);

        router.push('/');
      }

      if (window.location.pathname === '/feed') {
        dispatch(setIsAuthLoading(false));
        setIsLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, [dispatch, router, userState.username, userData, error, isLoading, firebaseUserId]);

  useEffect(() => {
    if (currentUser?.email) {
      refetch();
    }
  }, [currentUser?.email, refetch]);

  return { user: userState, currentUser, fbAuthUser, isLoadingUser };
};

export default useUser;
