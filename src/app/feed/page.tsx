'use client';

import React, { useEffect, useRef, useState } from 'react';
import NewPost from '@/components/new-post/new-post';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import Post from '@/components/post/post';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Discover from '@/components/doscover/discover';

import { useDispatch } from 'react-redux';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import useUser from '@/hooks/useUser';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { FeedTab, LoadingSkeletons } from '@/app/constants';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';

const Home = (): React.ReactNode => {
  const [postsByDate, setPostsByDate] = useState<PostType[]>([]);
  const [postsByLike, setPostsByLike] = useState<PostType[]>([]);
  const [lastPostIdForDate, setLastPostIdForDate] = useState('');
  const [lastPostIdForLike, setLastPostIdForLike] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>(FeedTab.LATEST);
  const [isLikeTabClicked, setIsLikeTabClicked] = useState(false);

  const isPending = useRef(false);

  const { fbAuthUser } = useUser();

  const dispatch = useDispatch();

  const setPosts = (data: any): void => {
    if (activeTab === FeedTab.LATEST) {
      const dataByDate = data.postsByDate ?? [];
      const mergedPostsByDate = [...postsByDate].concat(dataByDate as PostType[]);

      setPostsByDate(mergedPostsByDate);
      setLastPostIdForDate(data.lastPostIdByDate);
    } else {
      const dataByLike = data.postsByLike ?? [];
      const mergedPostsByLike = [...postsByLike].concat(dataByLike as PostType[]);

      setPostsByLike(mergedPostsByLike);
      setLastPostIdForLike(data.lastPostIdByLike);
    }
  };

  const mutationForDate = useMutation({
    mutationFn: () => postApiService.getFeedByDate(lastPostIdForDate),
    onSuccess: (data: any) => {
      setPosts(data);
      isPending.current = false;
    },
    onError: () => {
      dispatch(
        setUINotification({
          message: 'Bir hata oluştu.',
          notificationType: UINotificationEnum.ERROR,
        })
      );

      isPending.current = false;
    },
  });

  const mutationForLike = useMutation({
    mutationFn: () => postApiService.getFeedByLike(lastPostIdForLike),
    onSuccess: (data: any) => {
      setPosts(data);
      isPending.current = false;
    },
    onError: () => {
      dispatch(
        setUINotification({
          message: 'Bir hata oluştu.',
          notificationType: UINotificationEnum.ERROR,
        })
      );

      isPending.current = false;
    },
  });

  const getMutation = (): UseMutationResult<any, Error, void, unknown> =>
    activeTab === FeedTab.LATEST ? mutationForDate : mutationForLike;

  useInfiniteScroll({
    isFetchingNextPage: getMutation().isPending,
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

  return (
    <div className='flex min-w-full'>
      <div className='flex flex-col w-full min-1500:w-3/4'>
        <NewPost />
        <div className='lg:p-6 flex p-2 rounded-lg shadow-lg w-full self-start'>
          <Tabs
            defaultValue='latest'
            onValueChange={e => handleTabChange(e as FeedTab)}
            className='mt-2 w-full'
          >
            <TabsList className='w-full'>
              <TabsTrigger className='mr-10' value='latest'>
                En Son Gönderiler
              </TabsTrigger>
              <TabsTrigger value='popular'>En Popüler Gönderiler</TabsTrigger>
            </TabsList>
            <TabsContent value='latest'>
              {postsByDate.map(post => (
                <Post key={post.postId} post={post} />
              ))}
              <LoadingSkeleton type={LoadingSkeletons.POST} />
            </TabsContent>
            <TabsContent value='popular'>
              {postsByLike.map(post => (
                <Post key={post.postId} post={post} />
              ))}
              <LoadingSkeleton type={LoadingSkeletons.POST} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <div className='lg:flex max-1500:hidden sticky top-52 h-[170px] flex-col lg:w-1/4'>
        <Discover />
      </div>
    </div>
  );
};

export default Home;
