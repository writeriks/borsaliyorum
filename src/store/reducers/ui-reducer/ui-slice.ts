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
export interface UIState {
  isAuthLoading: boolean;
  isHamburgerMenuOpen: boolean;
  refetchUserStocks: boolean;
  uiNotification: UINotificationType;
  isAuthModalOpen: boolean;
  isNewPostModalOpen: boolean;
}

export const initialState: UIState = {
  isAuthLoading: false,
  isHamburgerMenuOpen: false,
  refetchUserStocks: false,
  uiNotification: {
    notificationType: UINotificationEnum.DEFAULT,
    message: 'message',
  },
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
  setUINotification,
  setIsNewPostModalOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
