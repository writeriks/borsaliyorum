import { notFound } from 'next/navigation';

import Discover from '@/components/discover/discover';
import React from 'react';
import prisma from '@/services/prisma-service/prisma-client';
import HashtagFeed from '@/components/hashtag-feed/hashtag-feed';
import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';

interface HashtagDetailPageProps {
  params: { id: string };
}

const HashtagPage = async ({ params }: HashtagDetailPageProps): Promise<React.ReactNode> => {
  const tagName = decodeURIComponent(params.id);
  const tag = await prisma.tag.findUnique({
    where: { tagName: tagName },
  });

  if (!tag) {
    notFound();
  }

  return (
    <div className='flex min-w-full justify-around'>
      <div className='flex flex-col w-full max-w-2xl '>
        <HashtagFeed tag={tag} />
      </div>
      <div className='lg:flex max-1500:hidden sticky top-12 ml-2 h-[260px] flex-col lg:w-[260px] '>
        <Discover />
      </div>
    </div>
  );
};

export default withAuthentication(HashtagPage);
