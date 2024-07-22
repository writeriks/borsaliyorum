import React from 'react';

import { useSelector } from 'react-redux';

import contextReducerSelector from '@/store/reducers/context-reducer/context-reducer-selector';

const InnerTopAd = (): React.ReactNode => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);
  // make the call for ad if not mobile

  return (
    <div className='flex lg:h-32 min-h-[140px] z-40 w-full items-center bg-background sticky top-14 rounded-lg shadow-lg justify-center text-base'>
      Inner Top Ad
    </div>
  );
};

export default InnerTopAd;
