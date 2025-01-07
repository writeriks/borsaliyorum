'use client';

import { Stock } from '@prisma/client';
import React from 'react';
import Feed from '@/components/feed/feed';
import StockProfileCard from '@/components/stock-profile-card/stock-profile-card';

interface StockFeedProps {
  stock: Stock & { isFollowingStock: boolean };
}
const StockProfile: React.FC<StockFeedProps> = ({ stock }) => (
  <div className='flex min-w-full'>
    <div className='flex flex-col w-full max-w-2xl '>
      <StockProfileCard stock={stock} />
      <Feed stock={stock} />
    </div>
  </div>
);

export default StockProfile;
