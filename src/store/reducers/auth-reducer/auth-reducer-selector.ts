import { createSelector } from "@reduxjs/toolkit";
import { type RootState } from "../../redux-store";
import { type AuthState } from "./auth-slice";

class AuthReducerSelector {
  getAuthReducer = (state: RootState): AuthState => state.auth;

  getLoginMethod = createSelector(
    this.getAuthReducer,
    (auth) => auth.loginMethod
  );
}

const authReducerSelector = new AuthReducerSelector();
export default authReducerSelector;
