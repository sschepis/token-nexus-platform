
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import orgReducer from './slices/orgSlice';
import tokenReducer from './slices/tokenSlice';
import userReducer from './slices/userSlice';
import auditReducer from './slices/auditSlice';
import notificationReducer from './slices/notificationSlice';
import routeReducer from './slices/routeSlice';
import appReducer from './slices/appSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  org: orgReducer,
  token: tokenReducer,
  user: userReducer,
  audit: auditReducer,
  notification: notificationReducer,
  route: routeReducer,
  app: appReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
