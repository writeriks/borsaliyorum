'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';

interface NavigationProgressState {
  isNavigating: boolean;
  progress: number;
}

interface NavigationProgressReturn {
  isNavigating: boolean;
  progress: number;
  startProgress: () => void;
  finishProgress: () => void;
  cancelProgress: () => void;
}

export const useNavigationProgress = (): NavigationProgressReturn => {
  const [state, setState] = useState<NavigationProgressState>({
    isNavigating: false,
    progress: 0,
  });

  const router = useRouter();
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  const startProgress = useCallback(() => {
    // Immediately show progress bar at 25% on click
    setState(prev => ({ ...prev, isNavigating: true, progress: 25 }));

    // Then continue with incremental progress
    const progressSteps = [
      { delay: 200, progress: 40 },
      { delay: 500, progress: 55 },
      { delay: 800, progress: 70 },
      { delay: 1200, progress: 80 },
      { delay: 1600, progress: 85 },
      { delay: 2000, progress: 90 },
    ];

    progressSteps.forEach(({ delay, progress }) => {
      setTimeout(() => {
        setState(prev => (prev.isNavigating ? { ...prev, progress } : prev));
      }, delay);
    });
  }, []);

  const finishProgress = useCallback(() => {
    setState(prev => ({ ...prev, isNavigating: true, progress: 100 }));
    setTimeout(() => {
      setState(prev => ({ ...prev, isNavigating: false, progress: 0 }));
    }, 400); // Slower fade out
  }, []);

  const cancelProgress = useCallback(() => {
    setState(prev => ({ ...prev, isNavigating: false, progress: 0 }));
  }, []);

  // Watch for pathname changes
  useEffect(() => {
    if (pathname !== lastPathname) {
      finishProgress();
      setLastPathname(pathname);
    }
  }, [pathname, lastPathname, finishProgress]);

  // Intercept router methods
  useEffect(() => {
    const originalPush = router.push;
    const originalReplace = router.replace;
    const originalBack = router.back;
    const originalForward = router.forward;

    // Override push method
    router.push = (...args) => {
      startProgress();
      return originalPush.apply(router, args);
    };

    // Override replace method
    router.replace = (...args) => {
      startProgress();
      return originalReplace.apply(router, args);
    };

    // Override back method
    router.back = () => {
      startProgress();
      return originalBack.apply(router);
    };

    // Override forward method
    router.forward = () => {
      startProgress();
      return originalForward.apply(router);
    };

    // Cleanup - restore original methods
    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
      router.back = originalBack;
      router.forward = originalForward;
    };
  }, [router, startProgress]);

  // Global click listener for navigation elements
  useEffect(() => {
    const handleClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;

      // Check if clicked element or its parent is a navigation element
      const navElement = target.closest('[data-nav="true"], a[href^="/"], .cursor-pointer');

      if (navElement) {
        const href = navElement.getAttribute('href');
        const isNavigation = navElement.getAttribute('data-nav');

        // Check if it's likely a navigation action
        if (isNavigation === 'true' || (href && href.startsWith('/'))) {
          startProgress();
        }
      }
    };

    // Add click listener to document
    document.addEventListener('click', handleClick, true); // Use capture phase

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [startProgress]);

  // Auto-cancel after timeout (fallback)
  useEffect(() => {
    if (state.isNavigating) {
      const timeout = setTimeout(() => {
        cancelProgress();
      }, 8000); // 8 second timeout

      return () => clearTimeout(timeout);
    }
  }, [state.isNavigating, cancelProgress]);

  return {
    isNavigating: state.isNavigating,
    progress: state.progress,
    startProgress,
    finishProgress,
    cancelProgress,
  };
};
