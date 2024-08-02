import { LoadingSkeletons } from '@/app/constants';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';

export type LoadingSkeletonProp = {
  type: LoadingSkeletons;
};

const LoadingSkeleton: React.FC<LoadingSkeletonProp> = ({ type }) => {
  switch (type) {
    case LoadingSkeletons.POST:
      return (
        <>
          <div className='flex items-start space-x-4'>
            <Skeleton className='h-12 w-12 rounded-full' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-5 w-[120px]' />
              <Skeleton className='h-5 w-[180px]' />
            </div>
          </div>
          <Skeleton className='h-72 mt-4 rounded-md' />
        </>
      );

    case LoadingSkeletons.USER_PROFILE:
      return (
        <div className='flex items-center rounded-lg w-[256px] top-[60px] h-[170px] sticky shadow-lg'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <div className='ml-2 space-y-2'>
            <Skeleton className='h-4 w-[150px]' />
            <Skeleton className='h-4 w-[100px]' />
          </div>
        </div>
      );
    case LoadingSkeletons.DISCOVER:
      return (
        <div className='flex items-center rounded-lg w-[256px] top-[60px] h-[170px] sticky shadow-lg'>
          <div className='ml-2 space-y-2'>
            <Skeleton className='h-4 w-[100px]' />
            <Skeleton className='h-4 w-[100px]' />
            <Skeleton className='h-4 w-[100px]' />
            <Skeleton className='h-4 w-[100px]' />
          </div>
        </div>
      );
    default:
      return <Skeleton />;
  }
};

export default LoadingSkeleton;
