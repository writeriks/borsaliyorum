import React from 'react';

import { notFound } from 'next/navigation';

import Discover from '@/components/discover/discover';
import UserProfile from '@/components/user-profile/user-profile';

import prisma from '@/services/prisma-service/prisma-client';
import { User } from '@prisma/client';
import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';

interface UserPageProps {
  params: { id: string };
  currentUser: User;
}

const UserPage = async ({ params, currentUser }: UserPageProps) => {
  const username = decodeURIComponent(params.id);
  const user = await prisma.user.findUnique({
    where: { username: username },
    select: {
      username: true,
      displayName: true,
      bio: true,
      profilePhoto: true,
      birthday: true,
      email: true,
      website: true,
      createdAt: true,
      updatedAt: true,
      premiumBeginDate: true,
      premiumEndDate: true,
      posts: true,
      likedPosts: true,
      likedComments: true,
      userId: true,
    },
  });

  if (!user) {
    notFound();
  }

  const userFollowerCount = await prisma.userFollowers.count({
    where: { followingId: user?.userId },
  });
  const userFollowingCount = await prisma.userFollowers.count({
    where: { followerId: user?.userId },
  });

  // Check if the current user is blocked by the user
  const isCurrentUserBlockedByUser = await prisma.userBlocks.findFirst({
    where: {
      blockedId: currentUser?.userId,
      blockerId: user.userId,
    },
  });

  // Check if the current user is following the specified user
  const isFollowingUser = await prisma.userFollowers.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUser.userId,
        followingId: user.userId,
      },
    },
  });

  if (isCurrentUserBlockedByUser) {
    notFound();
  }

  const isProfileOwner = currentUser?.userId === user.userId;
  const userWithFollowers = {
    ...user,
    isFollowingUser: !!isFollowingUser,
    userFollowerCount,
    userFollowingCount,
    isProfileOwner,
  };

  return (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-2xl '>
        <UserProfile user={userWithFollowers} />
      </div>
      <div className='lg:flex max-1500:hidden sticky top-12 ml-2 h-[260px] flex-col lg:w-[260px] '>
        <Discover />
      </div>
    </div>
  );
};

export default withAuthentication(UserPage);
