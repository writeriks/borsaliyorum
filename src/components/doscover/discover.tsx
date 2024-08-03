import React, { useEffect } from 'react';
import discoverApiService from '@/services/api-service/discover-api-service/discover-api-service';
import { useQuery } from '@tanstack/react-query';
import useUser from '@/hooks/useUser';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import { Tag } from '@/services/firebase-service/types/db-types/tag';
import { useDispatch, useSelector } from 'react-redux';
import discoverReducerSelector from '@/store/reducers/discover-reducer/discover-reducer-selector';
import { setTrendingTags } from '@/store/reducers/discover-reducer/discover-slice';
import { isWithinXHoursFromNow } from '@/services/util-service/util-service';

const Discover: React.FC = () => {
  const trends = useSelector(discoverReducerSelector.getTrendingTags);
  const trendingTagsSetDate = useSelector(discoverReducerSelector.getTrendingTagsSetDate);

  const dispatch = useDispatch();

  const { fbAuthUser } = useUser();

  const { refetch, isLoading } = useQuery({
    queryKey: ['get-trends'],
    queryFn: () => discoverApiService.getTrends(),
    enabled: false,
  });

  useEffect(() => {
    if (!fbAuthUser) return;

    const fetchTrends = async (): Promise<void> => {
      const { data } = await refetch();
      dispatch(setTrendingTags(data as Tag[]));
    };

    if (!trends.length || !isWithinXHoursFromNow(trendingTagsSetDate, 2)) {
      fetchTrends();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbAuthUser]);

  // TODO: Create components and style them
  const renderTrends = (): React.ReactNode => {
    if (isLoading) {
      return <LoadingSkeleton type={LoadingSkeletons.DISCOVER} />;
    } else if (trends.length) {
      return trends.map(trend => <div key={trend.tagId}>{trend.tagId}</div>);
    }
    return <div>No Trends</div>;
  };

  return <>{renderTrends()}</>;
};

export default Discover;
