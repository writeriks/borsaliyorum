import { notFound } from 'next/navigation';

import Discover from '@/components/discover/discover';
import React from 'react';
import prisma from '@/services/prisma-service/prisma-client';
import StockProfile from '@/components/stock-profile/stock-profile';
import { User } from '@prisma/client';
import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';

interface StockDetailPageProps {
  params: { id: string };
  currentUser: User;
}

const StockPage = async ({
  params,
  currentUser,
}: StockDetailPageProps): Promise<React.ReactNode> => {
  const stockId = decodeURIComponent(params.id).substring(1);
  const stock = await prisma.stock.findUnique({
    where: { ticker: `${stockId}` },
  });

  if (!stock) {
    notFound();
  }

  const isFollowingStock = await prisma.stockFollowers.findUnique({
    where: {
      userId_stockId: {
        userId: currentUser.userId,
        stockId: stock.stockId,
      },
    },
  });

  const stockWithIfUserFollows = {
    ...stock,
    isFollowingStock: !!isFollowingStock,
  };

  return (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-2xl '>
        <StockProfile stock={stockWithIfUserFollows} />
      </div>
      <div className='lg:flex max-1500:hidden sticky top-12 ml-2 h-[260px] flex-col lg:w-[260px] '>
        <Discover />
      </div>
    </div>
  );
};

export default withAuthentication(StockPage);
