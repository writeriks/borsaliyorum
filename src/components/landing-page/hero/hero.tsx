'use client';

import { Button } from '@/components/ui/button';
import { setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import React from 'react';
import { useDispatch } from 'react-redux';

import { useTranslations } from 'next-intl';

const Hero = (): React.ReactNode => {
  const dispatch = useDispatch();
  const t = useTranslations('userProfileOptions.LoginContainer');
  return (
    <section className='space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-28'>
      <div className='container flex max-w-[64rem] flex-col items-center gap-4 text-center'>
        <h1 className='font-heading text-3xl text-gray-100 sm:text-5xl md:text-6xl lg:text-7xl'>
          Borsa Topluluğunuz <span className='text-blue-300'>Burada Başlıyor</span>
        </h1>
        <p className='max-w-[42rem] leading-normal text-gray-300 sm:text-xl sm:leading-8'>
          Yatırımcılarla bağlantı kurun, piyasa görüşlerinizi paylaşın ve toplulukla birlikte
          büyüyün.
        </p>
        <div className='space-x-4'>
          <Button
            size='lg'
            className='bg-bluePrimary w-60 text-xl text-slate-50 hover:bg-blue-600'
            onClick={() => dispatch(setIsAuthModalOpen(true))}
          >
            Hemen Başla
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
