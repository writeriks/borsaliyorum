import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export enum LoginMethod {
  EmailAndPassword = 'emailAndPassword',
  Google = 'google',
}

export interface AuthState {
  loginMethod: LoginMethod;
}

export const initialState: AuthState = {
  loginMethod: LoginMethod.EmailAndPassword,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoginMethod: (state, action: PayloadAction<LoginMethod>) => {
      state.loginMethod = action.payload;
    },
  },
});

export const { setLoginMethod } = authSlice.actions;

export default authSlice.reducer;
