'use client';

import React from 'react';

import { LoadingSkeletons } from '@/app/constants';
import { useQuery } from '@tanstack/react-query';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import Post from '@/components/post/post';
import { Button } from '@/components/ui/button';
import { useDispatch } from 'react-redux';
import { setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';

const LandingPageFeed = (): React.ReactNode => {
  const dispatch = useDispatch();
  const { data } = useQuery({
    queryKey: [`get-landing-page-feed`],
    queryFn: async () => await postApiService.getLandingPageFeed(),
  });

  return (
    <>
      <div className='flex flex-col w-full max-w-2xl'>
        <section className='pb-8'>
          <div className='container flex max-w-[64rem] flex-col items-center gap-4 text-center'>
            <h2 className='font-heading text-3xl text-gray-100 sm:text-3xl md:text-4xl lg:text-5xl'>
              Borsa Topluluğunuz <span className='text-blue-300'>Burada Başlıyor</span>
            </h2>
            <p className='max-w-[42rem] leading-normal text-gray-300 sm:text-xl sm:leading-8'>
              Yatırımcılarla bağlantı kurun, piyasa görüşlerinizi paylaşın ve toplulukla birlikte
              büyüyün.
            </p>
            <div className='space-x-4'>
              <Button
                size='lg'
                className='bg-blue-600 w-72 text-gray-100 hover:bg-blue-700'
                onClick={() => dispatch(setIsAuthModalOpen(true))}
              >
                Hemen Başla
              </Button>
            </div>
          </div>
        </section>

        <section className='p-8'>
          {data?.posts?.length ? (
            data.posts.map(post => <Post key={post.postId} post={post} />)
          ) : (
            <LoadingSkeleton type={LoadingSkeletons.POST} />
          )}
        </section>
      </div>
    </>
  );
};

export default LandingPageFeed;
