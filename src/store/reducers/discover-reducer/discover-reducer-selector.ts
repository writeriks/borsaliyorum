import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../redux-store';
import { DiscoverState } from '@/store/reducers/discover-reducer/discover-slice';
import { isWithinXHoursFromNow } from '@/services/util-service/util-service';

class DiscoverReducerSelector {
  getDiscoverReducer = (state: RootState): DiscoverState => state.discover;

  getTrendingTags = createSelector(this.getDiscoverReducer, discover =>
    discover.trendingTags.filter(tag => isWithinXHoursFromNow(tag.lastPostDate, 2))
  );

  getTrendingTagsSetDate = createSelector(
    this.getDiscoverReducer,
    discover => discover.lastTagSetDate
  );
}

const discoverReducerSelector = new DiscoverReducerSelector();
export default discoverReducerSelector;
