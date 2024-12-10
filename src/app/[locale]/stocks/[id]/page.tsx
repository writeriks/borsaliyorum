import { notFound } from 'next/navigation';

import Discover from '@/components/discover/discover';
import React from 'react';
import prisma from '@/services/prisma-service/prisma-client';
import StockFeed from '@/components/stock-feed/stock-feed';

interface StockDetailPageProps {
  params: { id: string };
}

const StockPage = async ({ params }: StockDetailPageProps): Promise<React.ReactNode> => {
  const stockId = decodeURIComponent(params.id).substring(1);
  const stock = await prisma.stock.findUnique({
    where: { ticker: `${stockId}` },
  });

  if (!stock) {
    notFound();
  }

  return (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-2xl '>
        <StockFeed stock={stock} />
      </div>
      <div className='lg:flex max-1500:hidden sticky top-12 ml-2 h-[260px] flex-col lg:w-[260px] '>
        <Discover />
      </div>
    </div>
  );
};

export default StockPage;
