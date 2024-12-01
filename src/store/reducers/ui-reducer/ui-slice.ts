import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export enum UINotificationEnum {
  DEFAULT = 'default',
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  INFO = 'info',
}

type UINotificationType = {
  notificationType: UINotificationEnum;
  message: string;
  duration?: number; // milliseconds
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
};

export enum ActiveSideBar {
  DISCOVER = 'discover',
  PROFILE = 'profile',
}
export interface UIState {
  isAuthLoading: boolean;
  isHamburgerMenuOpen: boolean;
  refetchUserStocks: boolean;
  uiNotification: UINotificationType | null;
  activeSideBar: ActiveSideBar;
  isAuthModalOpen: boolean;
  isNewPostModalOpen: boolean;
}

export const initialState: UIState = {
  isAuthLoading: false,
  isHamburgerMenuOpen: false,
  refetchUserStocks: false,
  activeSideBar: ActiveSideBar.PROFILE,
  uiNotification: null,
  isAuthModalOpen: false,
  isNewPostModalOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isAuthLoading = action.payload;
    },

    toggleHamburgerMenuOpen: state => {
      state.isHamburgerMenuOpen = !state.isHamburgerMenuOpen;
    },

    setActiveSideBar: (state, action: PayloadAction<ActiveSideBar>) => {
      state.activeSideBar = action.payload;
    },

    setUINotification: (state, action: PayloadAction<UINotificationType>) => {
      state.uiNotification = action.payload;
    },

    setIsAuthModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isAuthModalOpen = action.payload;
    },

    setIsNewPostModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isNewPostModalOpen = action.payload;
    },
  },
});

export const {
  setIsAuthLoading,
  setIsAuthModalOpen,
  toggleHamburgerMenuOpen,
  setActiveSideBar,
  setUINotification,
  setIsNewPostModalOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
