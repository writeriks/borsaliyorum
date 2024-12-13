import { notFound } from 'next/navigation';

import Discover from '@/components/discover/discover';
import React from 'react';
import prisma from '@/services/prisma-service/prisma-client';
import UserFeed from '@/components/user-feed/user-feed';

interface UserPageProps {
  params: { id: string };
}

const UserPage = async ({ params }: UserPageProps): Promise<React.ReactNode> => {
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
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-2xl '>
        <UserFeed user={user} />
      </div>
      <div className='lg:flex max-1500:hidden sticky top-12 ml-2 h-[260px] flex-col lg:w-[260px] '>
        <Discover />
      </div>
    </div>
  );
};

export default UserPage;
