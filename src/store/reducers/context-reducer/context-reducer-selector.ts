import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../redux-store';
import { ContextState } from './context-slice';

class ContextReducerSelector {
  getContextReducer = (state: RootState): ContextState => state.context;

  getIsMobile = createSelector(this.getContextReducer, context => context.isMobile);
}

const contextReducerSelector = new ContextReducerSelector();
export default contextReducerSelector;
