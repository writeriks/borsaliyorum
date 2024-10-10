import React from 'react';

import { useSelector } from 'react-redux';

import contextReducerSelector from '@/store/reducers/context-reducer/context-reducer-selector';

const InnerTopAd = (): React.ReactNode => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);
  // make the call for ad if not mobile

  return (
    <div className='flex lg:h-24 min-h-12 md:sticky z-30 w-full items-center bg-background top-[60px]  justify-center text-base'>
      Inner Top Ad
    </div>
  );
};

export default InnerTopAd;
