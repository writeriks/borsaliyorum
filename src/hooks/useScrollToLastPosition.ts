import { ActiveScreen } from '@/app/constants';
import { useEffect, useRef } from 'react';

/**
 * Custom hook to save and restore the scroll position when navigating between screens.
 * The handlePopState is called when user click browser's back button.
 *
 * @param activeScreen - The current active screen. FEED or POST_DETAIL
 * @param setActiveScreen - A function to set the active screen.
 * @returns An object containing a function to save the current scroll position.
 */
const useScrollToLastPosition = (
  activeScreen: ActiveScreen,
  setActiveScreen: React.Dispatch<React.SetStateAction<ActiveScreen>>
): {
  saveScrollPosition: () => void;
} => {
  const scrollPosition = useRef(0);

  useEffect(() => {
    if (activeScreen === ActiveScreen.FEED) {
      window.scrollTo(0, scrollPosition.current);
    }
  }, [activeScreen]);

  useEffect(() => {
    const handlePopState = (): void => {
      if (activeScreen === ActiveScreen.POST_DETAIL) {
        setActiveScreen(ActiveScreen.FEED);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeScreen, setActiveScreen]);

  const saveScrollPosition = (): void => {
    scrollPosition.current = window.scrollY;
  };

  return { saveScrollPosition };
};

export default useScrollToLastPosition;