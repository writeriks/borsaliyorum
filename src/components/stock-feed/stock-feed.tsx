'use client';

import { Stock } from '@prisma/client';
import React from 'react';

interface StockFeedProps {
  stock: Stock;
}

const StockFeed: React.FC<StockFeedProps> = ({ stock }) => {
  return <div>{stock.ticker}</div>;
};

export default StockFeed;
