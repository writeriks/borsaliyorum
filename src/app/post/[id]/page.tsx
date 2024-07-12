'use client';

import React from 'react';

import NewPost from '@/components/new-post/new-post';
import Post from '@/components/post/post';
import Comment from '@/components/comment/comment';
import { Timestamp } from 'firebase/firestore';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import { useParams, useRouter } from 'next/navigation';
import { ArrowBigLeft, ArrowLeft, MoveLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PostDetail = (): React.ReactNode => {
  // Example Posts.
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
      media: { src: 'https://picsum.photos/500/500' },
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

  const comments: any[] = [
    {
      postId: 'post1',
      userId: 'user123',
      stockTickers: ['AAPL', 'TSLA'],
      likeCount: 120,
      commentCount: 45,
      content: 'Excited about the new iPhone release! Apple stocks are going up!',
      media: { src: '' },
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
      isPositiveSentiment: false,
      repostCount: 0,
    },
  ];

  const { back } = useRouter();
  const query = useParams();

  // TODO: Fetch post by id
  const foundPost = posts.find(p => p.postId === query.id);

  // TODO: Fetch comments by post id

  return (
    <div className='flex flex-col'>
      {foundPost ? (
        <>
          <Card onClick={() => back()} className='w-full max-w-2xl cursor-pointer'>
            <span className='inline-flex items-center justify-center p-3 bg-transparent'>
              <MoveLeft className='mr-2 h-5 w-5' /> Geri
            </span>
          </Card>
          <Post post={foundPost} />
          {comments.map(comment => (
            <div key={comment.commentId} className='mt-1'>
              <Comment comment={comment} />
            </div>
          ))}
        </>
      ) : (
        <>
          Gönderi bulunamadı.
          <button onClick={() => back()}>Geri Dön</button>
        </>
      )}
    </div>
  );
};

export default PostDetail;
