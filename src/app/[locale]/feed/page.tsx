import React from 'react';

import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import UserFeedWrapper from '@/components/user-feed-wrapper/user-feed-wrapper';
import PageWrapper from '@/components/page-wrapper/page-wrapper';

const Home = async (): Promise<React.ReactNode> => (
  <PageWrapper>
    <UserFeedWrapper />
  </PageWrapper>
);

export default withAuthentication(Home);
