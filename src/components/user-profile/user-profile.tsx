'use client';

import React from 'react';
import Feed from '@/components/feed/feed';
import UserProfileCard from '@/components/user-profile-card/user-profile-card';
import { UserWithFollowers } from '@/services/user-service/user-types';

interface UserFeedProps {
  user: UserWithFollowers;
}

const UserProfile: React.FC<UserFeedProps> = ({ user }) => {
  return (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-2xl '>
        <UserProfileCard user={user} />
        <Feed user={user} />
      </div>
    </div>
  );
};

export default UserProfile;
