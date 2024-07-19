'use client';

import React from 'react';

import NewPost from '@/components/new-post/new-post';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import { Timestamp } from 'firebase/firestore';
import Post from '@/components/post/post';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Discover from '@/components/doscover/discover';

const Home = (): React.ReactNode => {
  // Example Posts.
  // TODO: Fetch posts from following users db. Dont forget loading skeleton
  const posts: PostType[] = [
    {
      postId: 'post1',
      userId: 'user123',
      stockTickers: ['AAPL', 'TSLA'],
      likeCount: 120,
      commentCount: 45,
      content: 'Excited about the new iPhone release! Apple stocks are going up!',
      media: { src: 'https://picsum.photos/500/500', alt: '' },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isPositiveSentiment: true,
      repostCount: 0,
    },
    {
      postId: 'post2',
      userId: 'user456',
      stockTickers: ['GOOGL'],
      likeCount: 75,
      commentCount: 30,
      media: { src: '', alt: '' },
      content: 'Google announces major AI breakthrough! This could be huge for the tech industry.',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isPositiveSentiment: true,
      repostCount: 0,
    },
    {
      postId: 'post3',
      userId: 'user789',
      stockTickers: ['AMZN'],
      likeCount: 200,
      commentCount: 60,
      media: { src: 'https://picsum.photos/500/500', alt: '' },
      content: 'Amazon Prime Day sales are disappointing this year. Stock might take a hit.',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isPositiveSentiment: false,
      repostCount: 0,
    },
  ];

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
