import Discover from '@/components/discover/discover';
import React from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
  return (
    <div className='flex min-w-full justify-around'>
      <div className='md:w-2/3'>{children}</div>
      <div className='lg:flex max-1500:hidden sticky top-[156px] ml-2 h-[260px] flex-col lg:w-[260px]'>
        <Discover />
      </div>
    </div>
  );
};

export default PageWrapper;
