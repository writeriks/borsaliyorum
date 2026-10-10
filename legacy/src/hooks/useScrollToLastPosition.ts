import { useEffect, useRef } from 'react';

/**
 * Custom hook to save and restore the scroll position when navigating between screens.
 * @returns An object containing a function to save the current scroll position.
 */
const useScrollToLastPosition = (): {
  saveScrollPosition: () => void;
} => {
  const scrollPosition = useRef(0);

  useEffect(() => {
    // TODO: Implement scroll to last position with post detail page
    window.scrollTo(0, scrollPosition.current);
  }, []);

  const saveScrollPosition = (): void => {
    scrollPosition.current = window.scrollY;
  };

  return { saveScrollPosition };
};

export default useScrollToLastPosition;
