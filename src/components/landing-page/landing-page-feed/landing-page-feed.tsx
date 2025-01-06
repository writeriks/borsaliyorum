'use client';

import React from 'react';

import { LoadingSkeletons } from '@/app/constants';
import { useQuery } from '@tanstack/react-query';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import Post from '@/components/post/post';

const LandingPageFeed = (): React.ReactNode => {
  const { data } = useQuery({
    queryKey: [`get-landing-page-feed`],
    queryFn: async () => await postApiService.getLandingPageFeed(),
  });

  return (
    <>
      <div className='flex flex-col w-full max-w-2xl'>
        {data?.posts?.length ? (
          data.posts.map(post => <Post key={post.postId} post={post} />)
        ) : (
          <LoadingSkeleton type={LoadingSkeletons.POST} />
        )}
      </div>
    </>
  );
};

export default LandingPageFeed;
