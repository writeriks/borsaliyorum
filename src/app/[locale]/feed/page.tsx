'use client';

import React from 'react';

import Discover from '@/components/discover/discover';

import Feed from '@/components/feed/feed';

const Home = (): React.ReactNode => (
  <div className='flex min-w-full justify-center'>
    <div className='flex flex-col w-full max-w-2xl '>
      <Feed />
    </div>
    <div className='lg:flex max-1500:hidden sticky top-[156px] ml-2 h-[260px] flex-col lg:w-[260px] '>
      <Discover />
    </div>
  </div>
);

export default Home;
