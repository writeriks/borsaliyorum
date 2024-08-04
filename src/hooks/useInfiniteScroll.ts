import { useEffect, useCallback } from 'react';

type UseInfiniteScrollParams = {
  shouldFetchNextPage: boolean;
  fetchNextPage: () => void;
};

const useInfiniteScroll = ({
  shouldFetchNextPage,
  fetchNextPage,
}: UseInfiniteScrollParams): void => {
  const handleScroll = useCallback(() => {
    if (
      shouldFetchNextPage &&
      window.innerHeight + document.documentElement.scrollTop + 10 >=
        document.documentElement.offsetHeight
    ) {
      fetchNextPage();
    }
  }, [fetchNextPage, shouldFetchNextPage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
};

export default useInfiniteScroll;
