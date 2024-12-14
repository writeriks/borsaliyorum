'use client';

import { User } from '@prisma/client';
import React from 'react';
import Feed from '@/components/feed/feed';
import UserProfileCard from '@/components/user-profile-card/user-profile-card';

interface UserFeedProps {
  user: Partial<User>;
  userFollowerCount: number;
  userFollowingCount: number;
}

const UserFeed: React.FC<UserFeedProps> = ({ user, userFollowerCount, userFollowingCount }) => (
  <div className='flex min-w-full justify-center'>
    <div className='flex flex-col w-full max-w-2xl '>
      <UserProfileCard
        user={user}
        userFollowerCount={userFollowerCount}
        userFollowingCount={userFollowingCount}
      />
      <Feed user={user} />
    </div>
  </div>
);

export default UserFeed;
