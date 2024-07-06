import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export enum LoginMethod {
  EmailAndPassword = 'emailAndPassword',
  Google = 'google',
}

export interface ContextState {
  isMobile: boolean;
}

export const initialState: ContextState = {
  isMobile: false,
};

const contextSlice = createSlice({
  name: 'context',
  initialState,
  reducers: {
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },
  },
});

export const { setIsMobile } = contextSlice.actions;

export default contextSlice.reducer;
