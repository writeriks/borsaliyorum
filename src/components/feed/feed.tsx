import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActiveScreen, FeedTab } from '@/app/constants';
import FeedTabs from '@/components/feed-tabs/feed-tabs';
import NewPost from '@/components/new-post/new-post';
import PostDetail from '@/components/post/post-detail';
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
  const [selectedPost, setSelectedPost] = useState<Post>();
  const [activeTab, setActiveTab] = useState<FeedTab>(FeedTab.LATEST);
  const [isLikeTabClicked, setIsLikeTabClicked] = useState(false);
  const [lastPostIdForDate, setLastPostIdForDate] = useState('');
  const [lastPostIdForLike, setLastPostIdForLike] = useState('');
  const [activeScreen, setActiveScreen] = useState(ActiveScreen.FEED);

  const { fbAuthUser } = useUser();
  const dispatch = useDispatch();

  const { saveScrollPosition } = useScrollToLastPosition(activeScreen);

  const tickerWithoutDollarSign = stock?.ticker;

  const newPostId = useRef<string | null>(new URLSearchParams(window.location.search).get('post'));

  const { refetch: getPostById } = useQuery({
    queryKey: ['get-post-by-id', newPostId.current],
    queryFn: () => postApiService.getPostById(newPostId.current!),
    enabled: false,
  });

  const fetchStockFeed = async (): Promise<any> => {
    if (activeScreen === ActiveScreen.POST_DETAIL) return;

    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      return postApiService.getStockFeedByDate(lastPostIdForDate, stock!.ticker);
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      return postApiService.getStockFeedByLike(lastPostIdForLike, stock!.ticker);
    }
  };

  const fetchHashtagFeed = async (): Promise<any> => {
    if (activeScreen === ActiveScreen.POST_DETAIL) return;

    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      return postApiService.getHashtagFeedByDate(lastPostIdForDate, tag!.tagName);
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      return postApiService.getHashtagFeedByLike(lastPostIdForLike, tag!.tagName);
    }
  };

  const fetchUserFeed = async (): Promise<any> => {
    if (activeScreen === ActiveScreen.POST_DETAIL) return;

    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      return postApiService.getFeedByDate(lastPostIdForDate);
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      return postApiService.getFeedByLike(lastPostIdForLike);
    }
  };

  const fetchProfileFeed = async (): Promise<any> => {
    if (activeScreen === ActiveScreen.POST_DETAIL) return;

    if (activeTab === FeedTab.LATEST && lastPostIdForDate !== null) {
      // TODO: Implement getProfileFeedByDate
    }

    if (activeTab === FeedTab.POPULAR && lastPostIdForLike !== null) {
      // TODO: Implement getProfileFeedByLike
    }
  };

  const fetchFeed = async (): Promise<void> => {
    if (stock) {
      return fetchStockFeed();
    } else if (tag) {
      return fetchHashtagFeed();
    } else if (user) {
      return fetchProfileFeed();
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

  const handlePostClick = async (post: Post): Promise<void> => {
    saveScrollPosition(); // Save the scroll position before navigating away

    newPostId.current = post.postId.toString();
    const { data: updatedPost } = await getPostById();

    setSelectedPost(updatedPost);
    setActiveScreen(ActiveScreen.POST_DETAIL);
    history.pushState({}, '', `?post=${post.postId}`);
  };

  const handlePostDetailBackClick = useCallback(
    async (isBrowserBack = false): Promise<void> => {
      if (!selectedPost?.postId) return;

      newPostId.current = selectedPost?.postId.toString();
      const { data: updatedPost } = await getPostById();

      if (activeTab === FeedTab.LATEST) {
        const updatedPostsByDate = postsByDate.map(post =>
          post.postId === updatedPost?.postId ? updatedPost : post
        );
        setPostsByDate(updatedPostsByDate);
      } else {
        const updatedPostsByLike = postsByLike.map(post =>
          post.postId === updatedPost?.postId ? updatedPost : post
        );
        setPostsByLike(updatedPostsByLike);
      }

      if (isBrowserBack !== true) history.back(); // This will trigger the popstate event

      setActiveScreen(ActiveScreen.FEED);
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPost?.postId, activeTab, postsByDate, postsByLike]
  );

  useEffect(() => {
    const handlePopState = async (): Promise<void> => {
      if (activeScreen === ActiveScreen.POST_DETAIL) {
        await handlePostDetailBackClick(true);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeScreen, handlePostDetailBackClick]);

  useEffect(() => {
    if (!fbAuthUser) return;

    if (newPostId.current) {
      (async () => {
        const { data } = await getPostById();
        if (data) {
          setSelectedPost(data);
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
        <>
          {!user && <NewPost ticker={tickerWithoutDollarSign} />}
          <FeedTabs
            activeTab={activeTab}
            postsByDate={postsByDate}
            postsByLike={postsByLike}
            onTabChange={handleTabChange}
            onPostClick={handlePostClick}
            isLoading={mutation.isPending}
          />
        </>
      ) : (
        <PostDetail onBackClick={handlePostDetailBackClick} post={selectedPost!} />
      )}
    </>
  );
};

export default Feed;
