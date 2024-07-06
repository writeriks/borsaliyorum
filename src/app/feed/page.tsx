'use client';

import React from 'react';

import NewPost from '@/components/new-post/new-post';

const Home = (): React.ReactNode => {
  return (
    <div className='flex flex-col justify-center items-center'>
      <NewPost />
    </div>
  );
};

export default Home;
