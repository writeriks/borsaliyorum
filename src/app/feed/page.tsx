'use client';

import React, { useEffect, useState } from 'react';
import NewPost from '@/components/new-post/new-post';

import Post from '@/components/post/post';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Discover from '@/components/discover/discover';

import { useDispatch } from 'react-redux';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import useUser from '@/hooks/useUser';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { ActiveScreen, FeedTab, LoadingSkeletons } from '@/app/constants';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { Post as PostType } from '@prisma/client';
import useScrollToPost from '@/hooks/useScrollToPost';
import PostDetail from '@/components/post/post-detail';
import { useRouter } from 'next/navigation';

const Home = (): React.ReactNode => {
  const [postsByDate, setPostsByDate] = useState<PostType[]>([]);
  const [postsByLike, setPostsByLike] = useState<PostType[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostType>();
  const [lastPostIdForDate, setLastPostIdForDate] = useState('');
  const [lastPostIdForLike, setLastPostIdForLike] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>(FeedTab.LATEST);
  const [isLikeTabClicked, setIsLikeTabClicked] = useState(false);
  const [activeScreen, setActiveScreen] = useState(ActiveScreen.FEED);

  const { fbAuthUser } = useUser();
  const router = useRouter();

  const dispatch = useDispatch();

  const { saveScrollPosition } = useScrollToPost(activeScreen, setActiveScreen);

  const setPosts = (data: any): void => {
    if (!data) return;

    if (activeTab === FeedTab.LATEST) {
      const dataByDate = data.postsByDate ?? [];

      setPostsByDate([...postsByDate, ...dataByDate]);
      setLastPostIdForDate(data.lastPostIdByDate);
    } else {
      const dataByLike = data.postsByLike ?? [];

      setPostsByLike([...postsByLike, ...dataByLike]);
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
      if (
        lastPostIdForDate === undefined ||
        lastPostIdForDate === null ||
        activeScreen === ActiveScreen.POST_DETAIL
      ) {
        return;
      }

      return postApiService.getFeedByDate(lastPostIdForDate);
    },
    onSuccess: setPosts,
    onError: handleError,
  });

  const mutationForLike = useMutation({
    mutationFn: async () => {
      if (
        lastPostIdForLike === undefined ||
        lastPostIdForLike === null ||
        activeScreen === ActiveScreen.POST_DETAIL
      ) {
        return;
      }

      return postApiService.getFeedByLike(lastPostIdForLike);
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

  return activeScreen === ActiveScreen.POST_DETAIL ? (
    <PostDetail onBackClick={handlePostDetailBackClick} post={selectedPost!} />
  ) : (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-2xl '>
        <NewPost />
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
      </div>
      <div className='lg:flex max-1500:hidden sticky ml-2 h-[260px] flex-col lg:w-[260px] '>
        <Discover />
      </div>
    </div>
  );
};

export default Home;
