import React from 'react';
import Discover from '@/components/discover/discover';
import { User } from '@prisma/client';

interface PageWrapperProps {
  children: React.ReactNode;
  currentUser?: Partial<User>;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children, currentUser }) => (
  <div className='flex min-w-full justify-around'>
    <div className='md:w-1/2'>{children}</div>

    {currentUser ? (
      <div className='lg:flex max-1500:hidden sticky top-[156px] ml-2 h-[260px] flex-col lg:w-[260px]'>
        <Discover />
      </div>
    ) : null}
  </div>
);

export default PageWrapper;
