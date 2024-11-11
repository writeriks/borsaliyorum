'use client';

import { Stock } from '@prisma/client';
import React from 'react';
import NewPost from '@/components/new-post/new-post';
import Feed from '@/components/feed/feed';

interface StockFeedProps {
  stock: Stock;
}

const StockFeed: React.FC<StockFeedProps> = ({ stock }) => (
  <div className='flex min-w-full justify-center'>
    <div className='flex flex-col w-full max-w-2xl '>
      <NewPost />
      <Feed stock={stock} />
    </div>
  </div>
);

export default StockFeed;
