import React from 'react';

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { auth } from '@/services/firebase-service/firebase-admin';

import Discover from '@/components/discover/discover';
import UserProfile from '@/components/user-profile/user-profile';

import prisma from '@/services/prisma-service/prisma-client';

interface UserPageProps {
  params: { id: string };
}

const UserPage = async ({ params }: UserPageProps): Promise<React.ReactNode> => {
  // Get the current user from the request headers and verify the user's identity
  const cookieStore = cookies();
  const token = cookieStore.get('identity')?.value;
  const decodedToken = await auth.verifyIdToken(token as string);
  const currentUser = await prisma.user.findUnique({
    where: {
      firebaseUserId: decodedToken.uid,
    },
  });

  // Get the user from the database
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
  const userFollowerCount = await prisma.userFollowers.count({
    where: { followingId: user?.userId },
  });
  const userFollowingCount = await prisma.userFollowers.count({
    where: { followerId: user?.userId },
  });

  if (!user) {
    notFound();
  }

  // Check if the current user is blocked by the user
  const isCurrentUserBlockedByUser = await prisma.userBlocks.findFirst({
    where: {
      blockedId: currentUser?.userId,
      blockerId: user.userId,
    },
  });

  if (isCurrentUserBlockedByUser) {
    notFound();
  }

  const isProfileOwner = currentUser?.userId === user.userId;

  return (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-2xl '>
        <UserProfile
          user={user}
          userFollowerCount={userFollowerCount}
          userFollowingCount={userFollowingCount}
          isProfileOwner={isProfileOwner}
        />
      </div>
      <div className='lg:flex max-1500:hidden sticky top-12 ml-2 h-[260px] flex-col lg:w-[260px] '>
        <Discover />
      </div>
    </div>
  );
};

export default UserPage;
