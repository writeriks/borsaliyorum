import { ActiveScreen, FeedTab } from '@/app/constants';
import FeedTabs from '@/components/feed-tabs/feed-tabs';
import PostDetailModal from '@/components/post-detail-modal/post-detail-modal';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import useScrollToLastPosition from '@/hooks/useScrollToLastPosition';
import useUser from '@/hooks/useUser';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { Post, Stock } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

interface FeedProps {
  stock?: Stock;
}

const Feed: React.FC<FeedProps> = ({ stock }) => {
  const [postsByDate, setPostsByDate] = useState<Post[]>([]);
  const [postsByLike, setPostsByLike] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post>();
  const [activeTab, setActiveTab] = useState<FeedTab>(FeedTab.LATEST);
  const [isLikeTabClicked, setIsLikeTabClicked] = useState(false);
  const [lastPostIdForDate, setLastPostIdForDate] = useState('');
  const [lastPostIdForLike, setLastPostIdForLike] = useState('');
  const [activeScreen, setActiveScreen] = useState(ActiveScreen.FEED);

  const { fbAuthUser } = useUser();
  const dispatch = useDispatch();

  const { saveScrollPosition } = useScrollToLastPosition(activeScreen, setActiveScreen);

  const fetchStockFeed = async (): Promise<any> => {
    if (activeScreen === ActiveScreen.POST_DETAIL) return;

    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      return postApiService.getStockFeedByDate(lastPostIdForDate, stock!.ticker);
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      return postApiService.getStockFeedByLike(lastPostIdForLike, stock!.ticker);
    }
  };

  // TODO: Implement user feed fetching
  const fetchUserFeed = async (): Promise<any> => {
    if (activeScreen === ActiveScreen.POST_DETAIL) return;

    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      return postApiService.getFeedByDate(lastPostIdForDate);
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      return postApiService.getFeedByLike(lastPostIdForLike);
    }
  };

  const fetchFeed = async (): Promise<void> => {
    if (stock) {
      return fetchStockFeed();
    } else {
      return fetchUserFeed();
    }
  };

  const setPostsForStockFeed = (data: any): void => {
    if (!data) return;

    if (activeTab === FeedTab.LATEST) {
      const dataByDate = data.stockPostsByDate ?? [];

      setPostsByDate(prevPostsByDate => [...prevPostsByDate, ...dataByDate]);
      setLastPostIdForDate(data.lastPostIdByDate);
    } else {
      const dataByLike = data.stockPostsByLike ?? [];

      setPostsByLike(prevPostsByLike => [...prevPostsByLike, ...dataByLike]);
      setLastPostIdForLike(data.lastPostIdByLike);
    }
  };

  const setPostsForUserFeed = (data: any): void => {
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

  const setPosts = (data: any): void => {
    if (stock) {
      setPostsForStockFeed(data);
    } else {
      setPostsForUserFeed(data);
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
    onSuccess: setPosts,
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

  const handlePostClick = (post: Post): void => {
    saveScrollPosition(); // Save the scroll position before navigating away
    setSelectedPost(post);
    setActiveScreen(ActiveScreen.POST_DETAIL);
    history.pushState({}, '', `?post=${post.postId}`);
  };

  const handlePostDetailBackClick = (): void => {
    setActiveScreen(ActiveScreen.FEED);
    history.back(); // This will trigger the popstate event
  };

  useEffect(() => {
    if (!fbAuthUser) return;

    const postId = new URLSearchParams(window.location.search).get('post');

    if (postId) {
      (async () => {
        const post = await postApiService.getPostById(postId);
        if (post) {
          setSelectedPost(post);
          setActiveScreen(ActiveScreen.POST_DETAIL);
        }
      })();
    }
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbAuthUser]);

  return (
    <>
      {activeScreen === ActiveScreen.FEED ? (
        <FeedTabs
          activeTab={activeTab}
          postsByDate={postsByDate}
          postsByLike={postsByLike}
          onTabChange={handleTabChange}
          onPostClick={handlePostClick}
          isLoading={mutation.isPending}
        />
      ) : (
        <PostDetailModal post={selectedPost!} onBackClick={handlePostDetailBackClick} />
      )}
    </>
  );
};

export default Feed;
