import React from 'react';

import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import PageWrapper from '@/components/page-wrapper/page-wrapper';
import { User } from '@prisma/client';
import UserNotifications from '@/components/user-notifications/user-notifications';

interface HomePageProps {
  params: { id: string };
  currentUser: User;
}

const Notifications = async ({ currentUser }: HomePageProps): Promise<React.ReactNode> => (
  <PageWrapper currentUser={currentUser}>
    <UserNotifications />
  </PageWrapper>
);

export default withAuthentication(Notifications);
