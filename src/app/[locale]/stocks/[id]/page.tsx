import { notFound } from 'next/navigation';

import React from 'react';
import prisma from '@/services/prisma-service/prisma-client';
import StockProfile from '@/components/stock-profile/stock-profile';
import { User } from '@prisma/client';
import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import PageWrapper from '@/components/page-wrapper/page-wrapper';

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
    <PageWrapper>
      <StockProfile stock={stockWithIfUserFollows} />
    </PageWrapper>
  );
};

export default withAuthentication(StockPage);
