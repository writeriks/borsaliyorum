import { ActiveScreen } from '@/app/constants';
import { useEffect, useRef } from 'react';

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
