'use client';

import { User } from '@prisma/client';
import React from 'react';
import Feed from '@/components/feed/feed';
import UserProfileCard from '@/components/user-profile-card/user-profile-card';

interface UserFeedProps {
  user: Partial<User>;
}

const UserFeed: React.FC<UserFeedProps> = ({ user }) => (
  <div className='flex min-w-full justify-center'>
    <div className='flex flex-col w-full max-w-2xl '>
      <UserProfileCard user={user} />
      <Feed user={user} />
    </div>
  </div>
);

export default UserFeed;
