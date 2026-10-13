'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { onAuthStateChanged, User as FBAuthUserType } from 'firebase/auth';

import { auth } from '@/services/firebase-service/firebase-config';

import { queryClient } from '@/components/tanstack-provider/tanstack-provider';
import { setIsAuthLoading, setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import { UserState, setUser } from '@/store/reducers/user-reducer/user-slice';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';

import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useQuery } from '@tanstack/react-query';
import { User } from '@prisma/client';

type UserData = Pick<User, 'displayName' | 'username' | 'email' | 'profilePhoto' | 'createdAt'>;

interface UseUserReturn {
  user: UserState | null;
  currentUser: UserData | null;
  isLoadingUser: boolean;
  error: Error | null;
  isAuthenticated: boolean;
}

const useUser = (): UseUserReturn => {
  const dispatch = useDispatch();
  const userState = useSelector(userReducerSelector.getUser);
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Use refs to prevent unnecessary re-renders
  const isInitializedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // User data query
  const {
    data: userData,
    error: queryError,
    isLoading: isUserDataLoading,
    isSuccess: isUserDataSuccess,
  } = useQuery({
    queryKey: ['user', firebaseUserId],
    queryFn: () => userApiService.getUserById(firebaseUserId as string),
    enabled: !!firebaseUserId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // User validation query
  const { refetch: validateUser } = useQuery({
    queryKey: ['validate-user', firebaseUserId],
    queryFn: () => userApiService.validateUser(auth.currentUser as FBAuthUserType),
    enabled: false,
  });

  // Stable callback for auth state changes - only depends on dispatch
  const handleAuthStateChange = useCallback(
    async (user: FBAuthUserType | null) => {
      try {
        setAuthError(null);

        if (user) {
          const userId = user.uid;

          // Only update if userId actually changed
          if (lastUserIdRef.current !== userId) {
            lastUserIdRef.current = userId;
            setFirebaseUserId(userId);

            // Validate user only on first auth or user change
            if (!isInitializedRef.current || userState?.userId !== userId) {
              await validateUser();
              isInitializedRef.current = true;
            }
          }
        } else {
          // User logged out
          lastUserIdRef.current = null;
          setFirebaseUserId(null);

          // Clear user state only if there was a user before
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
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setAuthError(err as Error);
      }
    },
    [dispatch, validateUser, userState?.userId] // Minimal, stable dependencies
  );

  // Effect to handle user data updates when query succeeds
  useEffect(() => {
    if (isUserDataSuccess && userData && firebaseUserId) {
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
  }, [isUserDataSuccess, userData, firebaseUserId, dispatch]);

  // Effect to handle query errors
  useEffect(() => {
    if (queryError && firebaseUserId) {
      console.error('User data query error:', queryError);
      dispatch(setIsAuthModalOpen(true));
      dispatch(setIsAuthLoading(false));
    }
  }, [queryError, firebaseUserId, dispatch]);

  // Effect to handle loading states
  useEffect(() => {
    if (isUserDataLoading && firebaseUserId) {
      dispatch(setIsAuthLoading(true));
    }
  }, [isUserDataLoading, firebaseUserId, dispatch]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
    return () => {
      unsubscribe();
      // Cancel queries with current firebaseUserId
      if (firebaseUserId) {
        queryClient.cancelQueries({ queryKey: ['user', firebaseUserId] });
        queryClient.cancelQueries({ queryKey: ['validate-user', firebaseUserId] });
      }
    };
  }, [handleAuthStateChange, firebaseUserId]);

  // Compute loading state
  const isLoadingUser = isUserDataLoading || (!userData && !!firebaseUserId && !queryError);

  // Compute error state
  const finalError = authError || queryError;

  return {
    user: userState || null,
    currentUser: userData || null,
    isLoadingUser,
    error: finalError,
    isAuthenticated: !!firebaseUserId && !!userData,
  };
};

export default useUser;
