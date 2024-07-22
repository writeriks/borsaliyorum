'use client';

import React, { useCallback, useEffect, useState } from 'react';
import NewPost from '@/components/new-post/new-post';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import Post from '@/components/post/post';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Discover from '@/components/doscover/discover';

import { useDispatch } from 'react-redux';
import postService from '@/services/post-service/post-service';
import { useMutation, useQuery } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import useUser from '@/hooks/useUser';
import { DocumentData } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase-service/firebase-config';

const Home = (): React.ReactNode => {
  const [postsByDate, setPostsByDate] = useState<PostType[]>([]);
  const [postsByLikes, setPostsByLikes] = useState<PostType[]>([]);
  const [lastDocumentForDate, setLastDocumentForDate] = useState<DocumentData>();
  const [lastDocumentForLike, setLastDocumentForLike] = useState<DocumentData>();

  const { authUser } = useUser();
  console.log('🚀 ~ Home ~ authUser:', authUser);

  const dispatch = useDispatch();

  const mutation = useMutation({
    mutationFn: ({
      lastDocumentForDateValue,
      lastDocumentForLikeValue,
    }: {
      lastDocumentForDateValue: DocumentData | undefined;
      lastDocumentForLikeValue: DocumentData | undefined;
    }) =>
      postService.getFeed({
        lastDocumentDate: lastDocumentForDateValue,
        lastDocumentLike: lastDocumentForLikeValue,
      }),
    onSuccess: (dataFromRefetch: any) => {
      console.log('dataFromRefetch: ', dataFromRefetch);

      const dataByDate = dataFromRefetch.postsByDate ?? [];
      const dataByLike = dataFromRefetch.postsByLikes ?? [];

      const mergedPostsByDate = [...postsByDate].concat(dataByDate as PostType[]);
      const mergedPostsByLikes = [...postsByLikes].concat(dataByLike as PostType[]);

      setLastDocumentForDate(dataFromRefetch.data?.postsByDate[dataByDate.length - 1]);
      setLastDocumentForLike(dataFromRefetch.data?.postsByLikes[dataByLike.length - 1]);

      setPostsByDate(mergedPostsByDate);
      setPostsByLikes(mergedPostsByLikes);
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

  const handleScroll = useCallback(async () => {
    console.log('window.innerHeight', window.innerHeight);
    console.log('document.documentElement.scrollTop', document.documentElement.scrollTop);
    console.log('document.documentElement.offsetHeight', document.documentElement.offsetHeight);

    console.log(
      'condition',
      window.innerHeight + document.documentElement.scrollTop ===
        document.documentElement.offsetHeight
    );

    if (
      window.innerHeight + document.documentElement.scrollTop + 10 >=
        document.documentElement.offsetHeight &&
      !mutation.isPending
    ) {
      const dataFromRefetch = mutation.mutate({
        lastDocumentForDateValue: lastDocumentForDate as DocumentData,
        lastDocumentForLikeValue: lastDocumentForLike as DocumentData,
      }); // await refetch();
      // const dataByDate = dataFromRefetch.data?.postsByDate ?? [];
      // const dataByLike = dataFromRefetch.data?.postsByLikes ?? [];

      // setLastDocumentForDate(dataFromRefetch.data?.postsByDate[dataByDate.length - 1]);
      // setLastDocumentForLike(dataFromRefetch.data?.postsByLikes[dataByLike.length - 1]);

      // const mergedPostsByDate = [...postsByDate].concat(dataByDate as PostType[]);
      // const mergedPostsByLikes = [...postsByLikes].concat(dataByLike as PostType[]);

      // setPostsByDate(mergedPostsByDate);
      // setPostsByLikes(mergedPostsByLikes);
    }
  }, [lastDocumentForDate, lastDocumentForLike]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  console.log('userFromState', authUser);
  console.log('postsByDate', postsByDate);

  useEffect(() => {
    const subsribe = onAuthStateChanged(auth, async user => {
      mutation.mutate({
        lastDocumentForDateValue: undefined,
        lastDocumentForLikeValue: undefined,
      });
    });

    // const fetchPosts = async (): Promise<void> => {
    //   if (authUser) {
    //     mutation.mutate({
    //       lastDocumentForDateValue: undefined,
    //       lastDocumentForLikeValue: undefined,
    //     });
    //     // const dataFromRefetch = await refetch();
    //     // const dataByDate = dataFromRefetch.data?.postsByDate ?? [];
    //     // const dataByLike = dataFromRefetch.data?.postsByLikes ?? [];

    //     // setLastDocumentForDate(dataFromRefetch.data?.postsByDate[dataByDate.length - 1]);
    //     // setLastDocumentForLike(dataFromRefetch.data?.postsByLikes[dataByLike.length - 1]);

    //     // setPostsByDate(dataByDate as PostType[]);
    //     // setPostsByLikes(dataByLike as PostType[]);
    //   }
    // };

    // fetchPosts();
  }, []);

  return (
    <div className='flex min-w-full'>
      <div className='flex flex-col w-full min-1500:w-3/4'>
        <NewPost />
        <div className='lg:p-6 flex p-2 rounded-lg shadow-lg w-full self-start'>
          <Tabs defaultValue='latest' className='mt-2 w-full'>
            <TabsList className='w-full'>
              <TabsTrigger className='mr-10' value='latest'>
                En Son Gönderiler
              </TabsTrigger>
              <TabsTrigger value='popular'>En Popüler Gönderiler</TabsTrigger>
            </TabsList>
            <TabsContent value='latest'>
              {posts.map(post => (
                <Post key={post.postId} post={post} />
              ))}
            </TabsContent>
            <TabsContent value='popular'>
              {posts.map(post => (
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
