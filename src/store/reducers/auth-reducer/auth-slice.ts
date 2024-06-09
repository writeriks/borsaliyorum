import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export enum LoginMethod {
  EmailAndPassword = "emailAndPassword",
  Google = "google",
}

export interface AuthState {
  isAuthenticated: boolean;
  loginMethod: LoginMethod;
}

export const initialState: AuthState = {
  isAuthenticated: false,
  loginMethod: LoginMethod.EmailAndPassword,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setIsAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },

    setLoginMethod: (state, action: PayloadAction<LoginMethod>) => {
      state.loginMethod = action.payload;
    },
  },
});

export const { setIsAuthenticated } = authSlice.actions;

export default authSlice.reducer;
