'use client';

import React from 'react';

import NewPost from '@/components/new-post/new-post';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import { Timestamp } from 'firebase/firestore';
import Post from '@/components/post/post';

const Home = (): React.ReactNode => {
  // Example Posts.
  // TODO: Fetch posts from following users db
  const posts: PostType[] = [
    {
      postId: 'post1',
      userId: 'user123',
      stockTickers: ['AAPL', 'TSLA'],
      likeCount: 120,
      commentCount: 45,
      content: 'Excited about the new iPhone release! Apple stocks are going up!',
      media: { src: 'https://picsum.photos/500/500' },
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
      media: { src: '' },
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
      media: { src: 'https://picsum.photos/500/500' },
      content: 'Amazon Prime Day sales are disappointing this year. Stock might take a hit.',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isPositiveSentiment: false,
      repostCount: 0,
    },
  ];

  return (
    <div className='flex flex-col'>
      <NewPost />
      {posts.map(post => (
        <div key={post.postId} className='mt-8'>
          <Post post={post} />
        </div>
      ))}
    </div>
  );
};

export default Home;
