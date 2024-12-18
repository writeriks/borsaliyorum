'use client';
import Feed from '@/components/feed/feed';
import React from 'react';

const UserFeedWrapper: React.FC = () => {
  return (
    <>
      <div className='flex flex-col w-full max-w-2xl '>
        <Feed />
      </div>
    </>
  );
};

export default UserFeedWrapper;
