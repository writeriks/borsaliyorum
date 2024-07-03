import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UserState {
  username: string;
  displayName: string;
  email: string;
  profilePhoto?: string;
  isAuthenticated: boolean;
}

export const initialState: UserState = {
  username: "",
  displayName: "",
  email: "",
  profilePhoto: "",
  isAuthenticated: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState>) => {
      state.displayName = action.payload.displayName;
      state.username = action.payload.username;
      state.email = action.payload.email;
      state.profilePhoto = action.payload.profilePhoto;
      state.isAuthenticated = action.payload.isAuthenticated;
    },
  },
});

export const { setUser } = userSlice.actions;

export default userSlice.reducer;
