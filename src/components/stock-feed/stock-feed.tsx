'use client';

import { ActiveScreen, FeedTab, LoadingSkeletons } from '@/app/constants';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import Post from '@/components/post/post';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PostDetail from '@/components/post/post-detail';
import useUser from '@/hooks/useUser';
import { Post as PostType, Stock } from '@prisma/client';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import useScrollToLastPosition from '@/hooks/useScrollToLastPosition';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import NewPost from '@/components/new-post/new-post';

interface StockFeedProps {
  stock: Stock;
}

const StockFeed: React.FC<StockFeedProps> = ({ stock }) => {
  const [postsByDate, setPostsByDate] = useState<PostType[]>([]);
  const [postsByLike, setPostsByLike] = useState<PostType[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostType>();
  const [lastPostIdForDate, setLastPostIdForDate] = useState('');
  const [lastPostIdForLike, setLastPostIdForLike] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>(FeedTab.LATEST);
  const [isLikeTabClicked, setIsLikeTabClicked] = useState(false);
  const [activeScreen, setActiveScreen] = useState(ActiveScreen.FEED);

  const { fbAuthUser } = useUser();

  const dispatch = useDispatch();

  const { saveScrollPosition } = useScrollToLastPosition(activeScreen, setActiveScreen);

  const setPosts = (data: any): void => {
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

  const handleError = (error: Error): void => {
    dispatch(
      setUINotification({
        message: error.message ?? 'Bir hata oluştu.',
        notificationType: UINotificationEnum.ERROR,
      })
    );
  };

  const mutationForDate = useMutation({
    mutationFn: async () => {
      if (lastPostIdForDate == null || activeScreen === ActiveScreen.POST_DETAIL) {
        return;
      }

      return postApiService.getStockFeedByDate(lastPostIdForDate, stock.ticker);
    },
    onSuccess: setPosts,
    onError: handleError,
  });

  const mutationForLike = useMutation({
    mutationFn: async () => {
      if (lastPostIdForLike == null || activeScreen === ActiveScreen.POST_DETAIL) {
        return;
      }

      return postApiService.getStockFeedByLike(lastPostIdForLike, stock.ticker);
    },
    onSuccess: setPosts,
    onError: handleError,
  });

  const getMutation = (): UseMutationResult<any, Error, void, unknown> =>
    activeTab === FeedTab.LATEST ? mutationForDate : mutationForLike;

  useInfiniteScroll({
    shouldFetchNextPage: !getMutation().isPending,
    fetchNextPage: getMutation().mutate,
  });

  const handleTabChange = (tabValue: FeedTab): void => {
    // call the mutation for like for the first time
    if (tabValue === FeedTab.POPULAR && !isLikeTabClicked) {
      setIsLikeTabClicked(true);
      mutationForLike.mutate();
    }

    setActiveTab(tabValue);
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

    getMutation().mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbAuthUser]);

  const handlePostClick = (post: PostType): void => {
    saveScrollPosition(); // Save the scroll position before navigating away
    setSelectedPost(post);
    setActiveScreen(ActiveScreen.POST_DETAIL);
    // TODO: Handle refresh case when in post detail.
    history.pushState({}, '', `?post=${post.postId}`);
  };

  const handlePostDetailBackClick = (): void => {
    setActiveScreen(ActiveScreen.FEED);
    history.back(); // This will trigger the popstate event
  };

  const renderScreen = {
    [ActiveScreen.FEED]: (
      <div className='w-full self-start'>
        <Tabs
          defaultValue={FeedTab.LATEST}
          onValueChange={value => handleTabChange(value as FeedTab)}
          className='mt-2 w-full'
        >
          <TabsList className='w-full'>
            <TabsTrigger className='mr-10' value={FeedTab.LATEST}>
              En Son Gönderiler
            </TabsTrigger>
            <TabsTrigger value={FeedTab.POPULAR}>En Popüler Gönderiler</TabsTrigger>
          </TabsList>
          <TabsContent value={FeedTab.LATEST}>
            {postsByDate.map(post => (
              <Post onPostClick={handlePostClick} key={post.postId} post={post} />
            ))}
            {getMutation().isPending && <LoadingSkeleton type={LoadingSkeletons.POST} />}
          </TabsContent>
          <TabsContent value={FeedTab.POPULAR}>
            {postsByLike.map(post => (
              <Post onPostClick={handlePostClick} key={post.postId} post={post} />
            ))}
            {getMutation().isPending && <LoadingSkeleton type={LoadingSkeletons.POST} />}
          </TabsContent>
        </Tabs>
      </div>
    ),
    [ActiveScreen.POST_DETAIL]: (
      <PostDetail onBackClick={handlePostDetailBackClick} post={selectedPost!} />
    ),
  };

  return (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-2xl '>
        <NewPost />
        {renderScreen[activeScreen]}
      </div>
      {/*     <div className='lg:flex max-1500:hidden sticky top-[156px] ml-2 h-[260px] flex-col lg:w-[260px] '>
        <Discover />
      </div> */}
    </div>
  );
};

export default StockFeed;
