import { createSelector } from '@reduxjs/toolkit';
import { type RootState } from '../../redux-store';
import { type UIState } from './ui-slice';

class UiReducerSelector {
  getUiReducer = (state: RootState): UIState => state.ui;

  getIsAuthLoading = createSelector(this.getUiReducer, ui => ui.isAuthLoading);

  getUINotification = createSelector(this.getUiReducer, ui => ui.uiNotification);

  getIsHamburgerMenuOpen = createSelector(this.getUiReducer, ui => ui.isHamburgerMenuOpen);

  getActiveSideBar = createSelector(this.getUiReducer, ui => ui.activeSideBar);

  getIsAuthModalOpen = createSelector(this.getUiReducer, ui => ui.isAuthModalOpen);

  getIsNewPostModalOpen = createSelector(this.getUiReducer, ui => ui.isNewPostModalOpen);

  getIsSearchModalOpen = createSelector(this.getUiReducer, ui => ui.isSearchModalOpen);
}

const uiReducerSelector = new UiReducerSelector();
export default uiReducerSelector;
