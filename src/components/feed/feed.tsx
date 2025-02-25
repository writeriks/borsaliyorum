import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FeedTab } from '@/app/constants';
import FeedTabs from '@/components/feed-tabs/feed-tabs';
import NewPost from '@/components/new-post/new-post';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import useScrollToLastPosition from '@/hooks/useScrollToLastPosition';
import useUser from '@/hooks/useUser';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { Post, Stock, Tag, User } from '@prisma/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';

interface FeedProps {
  stock?: Stock;
  tag?: Tag;
  user?: Partial<User>;
}

const Feed: React.FC<FeedProps> = ({ stock, tag, user }) => {
  const [postsByDate, setPostsByDate] = useState<Post[]>([]);
  const [postsByLike, setPostsByLike] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<FeedTab>(FeedTab.LATEST);
  const [isLikeTabClicked, setIsLikeTabClicked] = useState(false);
  const [lastPostIdForDate, setLastPostIdForDate] = useState('');
  const [lastPostIdForLike, setLastPostIdForLike] = useState('');

  const { currentUser } = useUser();
  const dispatch = useDispatch();

  // TODO: Implement scroll to last position
  // const { saveScrollPosition } = useScrollToLastPosition();

  const tickerWithoutDollarSign = stock?.ticker;

  const fetchStockFeed = async (): Promise<any> => {
    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      return postApiService.getStockFeedByDate(lastPostIdForDate, stock!.ticker);
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      return postApiService.getStockFeedByLike(lastPostIdForLike, stock!.ticker);
    }
  };

  const fetchHashtagFeed = async (): Promise<any> => {
    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      return postApiService.getHashtagFeedByDate(lastPostIdForDate, tag!.tagName);
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      return postApiService.getHashtagFeedByLike(lastPostIdForLike, tag!.tagName);
    }
  };

  const fetchUserFeed = async (): Promise<any> => {
    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      return postApiService.getFeedByDate(lastPostIdForDate);
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      return postApiService.getFeedByLike(lastPostIdForLike);
    }
  };

  const fetchUserProfileFeed = async (): Promise<any> => {
    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      return postApiService.getUserPostsByDate(lastPostIdForDate, user!.username!);
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      return postApiService.getUserPostsByLike(lastPostIdForLike, user!.username!);
    }
  };

  const fetchFeed = async (): Promise<void> => {
    if (stock) {
      return fetchStockFeed();
    } else if (tag) {
      return fetchHashtagFeed();
    } else if (user) {
      return fetchUserProfileFeed();
    } else {
      return fetchUserFeed();
    }
  };

  const setPostsForFeed = (data: any): void => {
    if (!data) return;

    if (activeTab === FeedTab.LATEST) {
      const dataByDate = data.postsByDate ?? [];

      setPostsByDate(prevPostsByDate => [...prevPostsByDate, ...dataByDate]);
      setLastPostIdForDate(data.lastPostIdByDate);
    } else {
      const dataByLike = data.postsByLike ?? [];

      setPostsByLike(prevPostsByLike => [...prevPostsByLike, ...dataByLike]);
      setLastPostIdForLike(data.lastPostIdByLike);
    }
  };

  const handleError = (error: Error): void => {
    dispatch(
      setUINotification({
        message: error.message ?? 'Bir hata oluştu.',
        notificationType: UINotificationEnum.ERROR,
      })
    );
  };

  const mutation = useMutation({
    mutationFn: fetchFeed,
    onSuccess: setPostsForFeed,
    onError: handleError,
  });

  useInfiniteScroll({
    shouldFetchNextPage: !mutation.isPending,
    fetchNextPage: mutation.mutate,
  });

  const handleTabChange = (tabValue: FeedTab): void => {
    if (tabValue === FeedTab.POPULAR && !isLikeTabClicked) {
      setIsLikeTabClicked(true);
      mutation.mutate();
    }

    setActiveTab(tabValue);
  };

  useEffect(() => {
    if (currentUser) mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  return (
    <>
      {!user && <NewPost ticker={tickerWithoutDollarSign} />}
      <FeedTabs
        activeTab={activeTab}
        postsByDate={postsByDate}
        postsByLike={postsByLike}
        onTabChange={handleTabChange}
        isLoading={mutation.isPending}
      />
    </>
  );
};

export default Feed;
