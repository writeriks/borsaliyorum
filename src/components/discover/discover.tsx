import React from 'react';
import discoverApiService from '@/services/api-service/discover-api-service/discover-api-service';
import { useQuery } from '@tanstack/react-query';
import useUser from '@/hooks/useUser';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import TrendingTopics from '@/components/discover/trending-topics';

const Discover: React.FC = () => {
  const { fbAuthUser } = useUser();

  const { data: trends, isLoading } = useQuery({
    queryKey: ['get-trends'],
    queryFn: () => discoverApiService.getTrends(),
    enabled: !!fbAuthUser,
  });

  // TODO: Create components and style them
  const renderTrends = (): React.ReactNode => {
    if (isLoading) {
      return <LoadingSkeleton type={LoadingSkeletons.DISCOVER} />;
    } else if (trends) {
      return <TrendingTopics trends={trends} />;
    }
    return <div>No Trends</div>;
  };

  return <>{renderTrends()}</>;
};

export default Discover;
