'use client';

import React, { useEffect, useState } from 'react';
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
import { trpc } from '@/server/client';

const Home = (): React.ReactNode => {
  const [postsByDate, setPostsByDate] = useState<PostType[]>([]);
  const [postsByLike, setPostsByLike] = useState<PostType[]>([]);
  const [lastPostIdForDate, setLastPostIdForDate] = useState('');
  const [lastPostIdForLike, setLastPostIdForLike] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>(FeedTab.LATEST);
  const [isLikeTabClicked, setIsLikeTabClicked] = useState(false);

  const { fbAuthUser } = useUser();

  const dispatch = useDispatch();

  const mutation = trpc.user.createUser.useMutation({
    onSuccess: data => {
      console.log('🚀 ~ Home ~ data:', data);
    },
    onError: error => {
      console.log('🚀 ~ Home ~ error:', error.message);
    },
  });
  const { refetch } = trpc.user.getUser.useQuery({ email: 'test@emir.com' }, { enabled: false });

  useEffect(() => {
    const createNewUser = async (): Promise<void> => {
      const { data: user2 } = await refetch();
      console.log('🚀 ~ createNewUser ~ user2:', user2);

      await mutation.mutateAsync({
        email: 'test@emir.com',
        name: 'test',
        secondName: 'test',
        surname: 'öztürk',
        username: 'test',
      });
      console.log('here');
    };
    createNewUser();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPosts = (data: any): void => {
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

  const mutationForDate = useMutation({
    mutationFn: async () => {
      if (lastPostIdForDate === undefined) {
        return;
      }

      return postApiService.getFeedByDate(lastPostIdForDate);
    },
    onSuccess: (data: any) => {
      if (data) {
        setPosts(data);
      }
    },
    onError: () => {
      dispatch(
        setUINotification({
          message: 'Bir hata oluştu.',
          notificationType: UINotificationEnum.ERROR,
        })
      );
    },
  });

  const mutationForLike = useMutation({
    mutationFn: async () => {
      if (lastPostIdForLike === undefined) {
        return;
      }

      return postApiService.getFeedByLike(lastPostIdForLike);
    },
    onSuccess: (data: any) => {
      if (data) {
        setPosts(data);
      }
    },
    onError: () => {
      dispatch(
        setUINotification({
          message: 'Bir hata oluştu.',
          notificationType: UINotificationEnum.ERROR,
        })
      );
    },
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

  return (
    <div className='flex min-w-full  justify-center'>
      <div className='flex flex-col w-full max-w-3xl '>
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
                <Post key={post.postId} post={post} />
              ))}
              {getMutation().isPending && <LoadingSkeleton type={LoadingSkeletons.POST} />}
            </TabsContent>
            <TabsContent value={FeedTab.POPULAR}>
              {postsByLike.map(post => (
                <Post key={post.postId} post={post} />
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
