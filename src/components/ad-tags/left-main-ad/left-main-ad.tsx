import React from 'react';

import { useSelector } from 'react-redux';

import contextReducerSelector from '@/store/reducers/context-reducer/context-reducer-selector';

const LeftMainAd = (): React.ReactNode => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);
  // make the call for ad if not mobile
  return (
    <>
      <div className='max-1500:hidden lg:flex lg:min-w-44 h-full sticky top-0 text-base'>
        <div className='flex items-center justify-center h-[800px] w-full'>
          <p className='text-center'>Ad Space (Left)</p>
        </div>
      </div>
    </>
  );
};

export default LeftMainAd;
