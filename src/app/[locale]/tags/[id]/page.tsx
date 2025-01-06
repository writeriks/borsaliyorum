import { notFound } from 'next/navigation';

import React from 'react';
import prisma from '@/services/prisma-service/prisma-client';
import HashtagFeed from '@/components/hashtag-feed/hashtag-feed';
import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import PageWrapper from '@/components/page-wrapper/page-wrapper';

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
    <PageWrapper>
      <HashtagFeed tag={tag} />
    </PageWrapper>
  );
};

export default withAuthentication(HashtagPage);
