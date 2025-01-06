'use client';

import React from 'react';
import discoverApiService from '@/services/api-service/discover-api-service/discover-api-service';
import { useQuery } from '@tanstack/react-query';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import TrendingTopics from '@/components/discover/trending-topics';
import useUser from '@/hooks/useUser';

const Discover: React.FC = () => {
  const { fbAuthUser } = useUser();

  const { data: trends, isLoading } = useQuery({
    queryKey: ['get-trends'],
    queryFn: () => discoverApiService.getTrends(),
    enabled: !!fbAuthUser,
  });

  const renderTrends = (): React.ReactNode => {
    if (!fbAuthUser) {
      return null;
    } else if (trends) {
      return <TrendingTopics trends={trends} />;
    } else if (isLoading) {
      return <LoadingSkeleton type={LoadingSkeletons.DISCOVER} />;
    }
  };

  return <>{renderTrends()}</>;
};

export default Discover;
