import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  username: string;
  displayName: string;
  email: string;
  profilePhoto?: string | null;
  createdAt: Date | null;
  userId: string | null;
}

export const initialState: UserState = {
  username: '',
  displayName: '',
  email: '',
  profilePhoto: '',
  createdAt: null,
  userId: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState>) => {
      state.displayName = action.payload.displayName;
      state.username = action.payload.username;
      state.email = action.payload.email;
      state.profilePhoto = action.payload.profilePhoto;
      state.createdAt = action.payload.createdAt;
      state.userId = action.payload.userId;
    },
  },
});

export const { setUser } = userSlice.actions;

export default userSlice.reducer;
