'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import useUser from './useUser';

/**
 * Hook to handle navigation logic based on authentication state
 * Separated from useUser to maintain single responsibility principle
 */
const useAuthNavigation = (): void => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoadingUser } = useUser();

  useEffect(() => {
    // Only redirect if we're not loading and we know the auth state
    if (!isLoadingUser) {
      // Redirect authenticated users from locale root pages to feed
      // Handles: /tr, /en, and / (root)
      if (isAuthenticated && (pathname === '/tr' || pathname === '/en' || pathname === '/')) {
        router.push('/feed');
      }

      // You can add more navigation rules here, for example:
      // - Redirect unauthenticated users from protected routes
      // - Handle different user roles
      // - Manage onboarding flows
    }
  }, [isAuthenticated, isLoadingUser, pathname, router]);
};

export default useAuthNavigation;
