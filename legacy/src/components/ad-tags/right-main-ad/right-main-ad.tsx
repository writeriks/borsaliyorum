import React from 'react';

import { useSelector } from 'react-redux';

import contextReducerSelector from '@/store/reducers/context-reducer/context-reducer-selector';

const RightMainAd = (): React.ReactNode => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);
  // make the call for ad if not mobile
  return (
    <>
      <div className='hidden lg:flex lg:min-w-44 h-full sticky top-0 text-base'>
        <div className='flex items-center justify-center h-[800px] w-full'>
          <p className='text-center'>Ad Space (Right)</p>
        </div>
      </div>
    </>
  );
};

export default RightMainAd;
