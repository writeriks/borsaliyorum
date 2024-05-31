import { createSelector } from "@reduxjs/toolkit";
import { type RootState } from "../../redux-store";
import { type UIState } from "./ui-slice";

class UiReducerSelector {
  getUiReducer = (state: RootState): UIState => state.ui;

  getIsLoading = createSelector(this.getUiReducer, (ui) => ui.isLoading);

  getIsHamburgerMenuOpen = createSelector(
    this.getUiReducer,
    (ui) => ui.isHamburgerMenuOpen
  );
}

const uiReducerSelector = new UiReducerSelector();
export default uiReducerSelector;
