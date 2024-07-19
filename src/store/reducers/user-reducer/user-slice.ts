import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { Timestamp } from 'firebase/firestore';

export interface UserState {
  username: string;
  displayName: string;
  email: string;
  profilePhoto?: string;
  userId: string;
  createdAt: Timestamp;
}

export const initialState: UserState = {
  username: '',
  displayName: '',
  email: '',
  userId: '',
  profilePhoto: '',
  createdAt: Timestamp.now(),
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
      state.userId = action.payload.userId;
    },
  },
});

export const { setUser } = userSlice.actions;

export default userSlice.reducer;
