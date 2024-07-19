'use client';

import React from 'react';

import Post from '@/components/post/post';
import Comment from '@/components/comment/comment';
import { Timestamp } from 'firebase/firestore';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import { useParams, useRouter } from 'next/navigation';
import { MoveLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import NewPost from '@/components/new-post/new-post';

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
      media: { src: 'https://picsum.photos/500/500', alt: '' },
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
  const post = posts.find(p => p.postId === query.id);

  // TODO: Fetch comments by post id

  return (
    <div className='flex flex-col'>
      {post ? (
        <>
          {/* TODO: when click back it should scroll to the previous post */}
          <Card onClick={() => back()} className='w-full cursor-pointer'>
            <span className='inline-flex items-center justify-center p-3 bg-transparent'>
              <MoveLeft className='mr-2 h-5 w-5' /> Geri
            </span>
          </Card>
          <Post post={post} />
          <div className='m-2'>
            <NewPost />
          </div>
          {comments.map(comment => (
            <Comment key={comment.commentId} comment={comment} />
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
