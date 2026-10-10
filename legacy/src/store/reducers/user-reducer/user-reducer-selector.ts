import { createSelector } from '@reduxjs/toolkit';
import { type RootState } from '../../redux-store';
import { type UserState } from './user-slice';

class UserReducerSelector {
  getUserReducer = (state: RootState): UserState => state.user;

  getUser = createSelector(this.getUserReducer, user => (!!user.username ? user : null));
}

const userReducerSelector = new UserReducerSelector();
export default userReducerSelector;
