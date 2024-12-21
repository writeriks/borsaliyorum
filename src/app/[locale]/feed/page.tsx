import React from 'react';

import Discover from '@/components/discover/discover';

import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import UserFeedWrapper from '@/components/user-feed-wrapper/user-feed-wrapper';

const Home = async (): Promise<React.ReactNode> => (
  <div className='flex min-w-full justify-center'>
    <UserFeedWrapper />
    <div className='lg:flex max-1500:hidden sticky top-[156px] ml-2 h-[260px] flex-col lg:w-[260px]'>
      <Discover />
    </div>
  </div>
);

export default withAuthentication(Home);
