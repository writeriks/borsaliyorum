'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Discover from '@/components/discover/discover';
import NewPost from '@/components/new-post/new-post';

const StockDetailPage = (): React.ReactNode => {
  const query = useParams();
  const { id } = query;

  const decodedId = id ? decodeURIComponent(id as string).substring(1) : '';

  return (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-2xl '>
        <NewPost ticker={decodedId as string} />
        {decodedId}
      </div>
      <div className='lg:flex max-1500:hidden sticky top-12 ml-2 h-[260px] flex-col lg:w-[260px] '>
        <Discover />
      </div>
    </div>
  );
};

export default StockDetailPage;
