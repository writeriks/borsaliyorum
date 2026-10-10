import React from 'react';

import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import UserFeedWrapper from '@/components/user-feed-wrapper/user-feed-wrapper';
import PageWrapper from '@/components/page-wrapper/page-wrapper';
import { User } from '@prisma/client';

interface HomePageProps {
  params: { id: string };
  currentUser: User;
}

const Home = async ({ currentUser }: HomePageProps): Promise<React.ReactNode> => (
  <PageWrapper currentUser={currentUser}>
    <UserFeedWrapper />
  </PageWrapper>
);

export default withAuthentication(Home);
