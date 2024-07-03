import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export enum LoginMethod {
  EmailAndPassword = "emailAndPassword",
  Google = "google",
}

export interface AuthState {
  loginMethod: LoginMethod;
  isAuthModalOpen: boolean;
}

export const initialState: AuthState = {
  loginMethod: LoginMethod.EmailAndPassword,
  isAuthModalOpen: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoginMethod: (state, action: PayloadAction<LoginMethod>) => {
      state.loginMethod = action.payload;
    },

    setIsAuthModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isAuthModalOpen = action.payload;
    },
  },
});

export const { setLoginMethod, setIsAuthModalOpen } = authSlice.actions;

export default authSlice.reducer;
