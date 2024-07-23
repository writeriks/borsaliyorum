'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import NewPost from '@/components/new-post/new-post';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import Post from '@/components/post/post';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Discover from '@/components/doscover/discover';

import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import useUser from '@/hooks/useUser';
import postApiService from '@/services/api-service/post-api-service/post-api-service';

const Home = (): React.ReactNode => {
  const [postsByDate, setPostsByDate] = useState<PostType[]>([]);
  const [postsByLikes, setPostsByLikes] = useState<PostType[]>([]);

  const isPending = useRef(false);

  const { fbAuthUser } = useUser();

  const dispatch = useDispatch();

  const mutation = useMutation({
    mutationFn: () => postApiService.getFeed(),
    onSuccess: (dataFromRefetch: any) => {
      const dataByDate = dataFromRefetch.postsByDate ?? [];
      const dataByLike = dataFromRefetch.postsByLikes ?? [];

      const mergedPostsByDate = [...postsByDate].concat(dataByDate as PostType[]);
      const mergedPostsByLikes = [...postsByLikes].concat(dataByLike as PostType[]);

      setPostsByDate(mergedPostsByDate);
      setPostsByLikes(mergedPostsByLikes);

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

  const handleScroll = useCallback(async () => {
    if (
      window.innerHeight + document.documentElement.scrollTop + 10 >=
        document.documentElement.offsetHeight &&
      !isPending.current
    ) {
      isPending.current = true;
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!fbAuthUser) return;

    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbAuthUser]);

  return (
    <div className='flex min-w-full'>
      <div className='flex flex-col w-full min-1500:w-3/4'>
        <NewPost />
        <div className='lg:p-6 flex p-2 rounded-lg shadow-lg w-full self-start'>
          <Tabs defaultValue='latest' onValueChange={e => console.log(e)} className='mt-2 w-full'>
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
            </TabsContent>
            <TabsContent value='popular'>
              {postsByLikes.map(post => (
                <Post key={post.postId} post={post} />
              ))}
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
