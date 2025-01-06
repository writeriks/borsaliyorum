'use client';

import React from 'react';
import discoverApiService from '@/services/api-service/discover-api-service/discover-api-service';
import { useQuery } from '@tanstack/react-query';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import TrendingTopics from '@/components/discover/trending-topics';

const Discover: React.FC = () => {
  const { data: trends, isLoading } = useQuery({
    queryKey: ['get-trends'],
    queryFn: () => discoverApiService.getTrends(),
  });

  const renderTrends = (): React.ReactNode => {
    if (trends) {
      return <TrendingTopics trends={trends} />;
    } else if (isLoading) {
      return <LoadingSkeleton type={LoadingSkeletons.DISCOVER} />;
    }
  };

  return <>{renderTrends()}</>;
};

export default Discover;
