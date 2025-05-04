'use client';

import { useEffect, useState, useCallback } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { onAuthStateChanged, User as FBAuthUserType } from 'firebase/auth';

import { auth } from '@/services/firebase-service/firebase-config';

import { queryClient } from '@/components/tanstack-provider/tanstack-provider';
import { setIsAuthLoading, setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import { UserState, setUser } from '@/store/reducers/user-reducer/user-slice';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';

import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useRouter, usePathname } from '@/i18n/routing';
import { User } from '@prisma/client';

type UserData = Pick<User, 'displayName' | 'username' | 'email' | 'profilePhoto' | 'createdAt'>;

const useUser = (): {
  user: UserState | null;
  currentUser: UserData | null;
  isLoadingUser: boolean;
  error: Error | null;
} => {
  const dispatch = useDispatch();
  const userState = useSelector(userReducerSelector.getUser);
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const userQueryOptions: UseQueryOptions<User | undefined, Error> = {
    queryKey: ['user', firebaseUserId],
    queryFn: () => userApiService.getUserById(firebaseUserId as string),
    enabled: !!firebaseUserId,
    retry: 2,
  };

  const { data: userData, error: queryError, isLoading } = useQuery(userQueryOptions);

  const { refetch: validateUser } = useQuery({
    queryKey: ['validate-user', firebaseUserId],
    queryFn: () => userApiService.validateUser(auth.currentUser as FBAuthUserType),
    enabled: false,
  });

  const handleAuthStateChange = useCallback(
    async (user: FBAuthUserType | null) => {
      try {
        setIsLoadingUser(true);
        setError(null);

        if (user) {
          setFirebaseUserId(user.uid);

          if (isLoading) {
            dispatch(setIsAuthLoading(true));
            return;
          }

          if (queryError) {
            dispatch(setIsAuthModalOpen(true));
            return;
          }

          if (!userData) {
            dispatch(setIsAuthModalOpen(false));
            return;
          }

          const { displayName, username, email, profilePhoto, createdAt } = userData;
          dispatch(
            setUser({
              displayName,
              username,
              email,
              profilePhoto,
              createdAt,
              userId: user.uid,
            })
          );

          await validateUser();

          dispatch(setIsAuthModalOpen(false));
          dispatch(setIsAuthLoading(false));
          setIsLoadingUser(false);

          if (pathname === '/' && !isLoadingUser && !userState?.userId) {
            router.push('/feed');
          }
        } else {
          if (userState?.userId) {
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
          }

          dispatch(setIsAuthModalOpen(false));
          dispatch(setIsAuthLoading(false));
          setIsLoadingUser(false);
        }
      } catch (err) {
        setError(err as Error);
        dispatch(setIsAuthModalOpen(true));
      } finally {
        setIsLoadingUser(false);
      }
    },
    [
      dispatch,
      router,
      pathname,
      userData,
      queryError,
      isLoading,
      validateUser,
      userState,
      isLoadingUser,
    ]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
    return () => {
      unsubscribe();
      queryClient.cancelQueries({ queryKey: ['user', firebaseUserId] });
      queryClient.cancelQueries({ queryKey: ['validate-user', firebaseUserId] });
    };
  }, [handleAuthStateChange, firebaseUserId]);

  return {
    user: userState || null,
    currentUser: userData || null,
    isLoadingUser,
    error,
  };
};

export default useUser;
