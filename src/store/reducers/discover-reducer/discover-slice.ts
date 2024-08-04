import { Tag } from '@/services/firebase-service/types/db-types/tag';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface DiscoverState {
  trendingTags: Tag[];
  lastTagSetDate: number;
}

export const initialState: DiscoverState = {
  trendingTags: [],
  lastTagSetDate: 0,
};

const discoverSlice = createSlice({
  name: 'discover',
  initialState,
  reducers: {
    setTrendingTags: (state, action: PayloadAction<Tag[]>) => {
      state.trendingTags = [...action.payload];
      state.lastTagSetDate = Date.now();
    },
    setTrendingTagsSetDate: (state, action: PayloadAction<number>) => {
      state.lastTagSetDate = action.payload;
    },
  },
});

export const { setTrendingTags, setTrendingTagsSetDate } = discoverSlice.actions;

export default discoverSlice.reducer;
