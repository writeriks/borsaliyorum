import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web

import uiSlice from "@/store/reducers/ui-reducer/ui-slice";
import authSlice from "@/store/reducers/auth-reducer/auth-slice";
import contextSlice from "@/store/reducers/context-reducer/context-slice";
import userSlice from "@/store/reducers/user-reducer/user-slice";

const rootReducer = combineReducers({
  ui: uiSlice,
  auth: authSlice,
  context: contextSlice,
  user: userSlice,
});

const persistConfig = {
  key: "root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  devTools: process.env.NODE_ENV != "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export const persistor = persistStore(store);
export default store;

/* export type RootState = ReturnType<typeof store.getState>;

export default store; */
