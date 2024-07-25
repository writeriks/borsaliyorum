import { useEffect, useCallback } from 'react';

type UseInfiniteScrollParams = {
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

const useInfiniteScroll = ({
  isFetchingNextPage,
  fetchNextPage,
}: UseInfiniteScrollParams): void => {
  const handleScroll = useCallback(() => {
    if (
      !isFetchingNextPage &&
      window.innerHeight + document.documentElement.scrollTop + 10 >=
        document.documentElement.offsetHeight
    ) {
      fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
};

export default useInfiniteScroll;
