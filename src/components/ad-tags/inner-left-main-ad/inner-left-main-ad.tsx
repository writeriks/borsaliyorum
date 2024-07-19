import React from 'react';

import { useSelector } from 'react-redux';

import contextReducerSelector from '@/store/reducers/context-reducer/context-reducer-selector';

const InnerLeftMainAd = (): React.ReactNode => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);
  // make the call for ad if not mobile

  return (
    <div
      id='inner-left-ad-section'
      className='max-1500:hidden sticky top-[230px] w-[256px] flex items-center justify-center text-base'
    >
      <div className='h-96'></div>
      INNER LEFT AD SECTION
    </div>
  );
};

export default InnerLeftMainAd;
