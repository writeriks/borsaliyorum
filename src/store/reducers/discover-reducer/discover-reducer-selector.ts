import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../redux-store';
import { DiscoverState } from '@/store/reducers/discover-reducer/discover-slice';

class DiscoverReducerSelector {
  getDiscoverReducer = (state: RootState): DiscoverState => state.discover;

  getTrendingTags = createSelector(this.getDiscoverReducer, discover => discover.trendingTags);

  getTrendingTagsSetDate = createSelector(
    this.getDiscoverReducer,
    discover => discover.lastTagSetDate
  );
}

const discoverReducerSelector = new DiscoverReducerSelector();
export default discoverReducerSelector;
