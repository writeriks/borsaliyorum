'use client';

import { Tag } from '@prisma/client';
import React from 'react';
import Feed from '@/components/feed/feed';

interface HashtagFeedProps {
  tag: Tag;
}

const HashtagFeed: React.FC<HashtagFeedProps> = ({ tag }) => (
  <div className='flex min-w-full justify-center'>
    <div className='flex flex-col w-full max-w-2xl '>
      <Feed tag={tag} />
    </div>
  </div>
);

export default HashtagFeed;
