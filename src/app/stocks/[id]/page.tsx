'use client';

import React from 'react';
import { useParams } from 'next/navigation';

const StockDetailPage = (): React.ReactNode => {
  const query = useParams();
  return <div>{query.id}</div>;
};

export default StockDetailPage;
