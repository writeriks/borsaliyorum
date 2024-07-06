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
  isLoading: boolean;
  isHamburgerMenuOpen: boolean;
  refetchUserStocks: boolean;
  uiNotification: UINotificationType;
}

export const initialState: UIState = {
  isLoading: false,
  isHamburgerMenuOpen: false,
  refetchUserStocks: false,
  uiNotification: {
    notificationType: UINotificationEnum.DEFAULT,
    message: 'message',
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    toggleHamburgerMenuOpen: state => {
      state.isHamburgerMenuOpen = !state.isHamburgerMenuOpen;
    },

    setUINotification: (state, action: PayloadAction<UINotificationType>) => {
      state.uiNotification = action.payload;
    },
  },
});

export const { setIsLoading, toggleHamburgerMenuOpen, setUINotification } = uiSlice.actions;

export default uiSlice.reducer;
