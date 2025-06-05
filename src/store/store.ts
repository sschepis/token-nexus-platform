
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './slices/authSlice';
import orgReducer from './slices/orgSlice';
import tokenReducer from './slices/tokenSlice';
import userReducer from './slices/userSlice';
import auditReducer from './slices/auditSlice';
import notificationReducer from './slices/notificationSlice';
import routeReducer from './slices/routeSlice';
import appReducer from './slices/appSlice';
import cloudFunctionReducer from './slices/cloudFunctionSlice';
import themeReducer from './slices/themeSlice';
import integrationReducer from './slices/integrationSlice';
import aiAssistantReducer from './slices/aiAssistantSlice'; // Import new aiAssistant slice
import appMarketplaceReducer from './slices/appMarketplaceSlice';
import triggerReducer from './slices/triggerSlice';
import scheduledJobReducer from './slices/scheduledJobSlice';
import workflowReducer from './slices/workflowSlice';

// Persist configuration for auth state
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'token', 'orgId', 'permissions', 'isAuthenticated', 'developerMode']
};

// Persist configuration for org state
const orgPersistConfig = {
  key: 'org',
  storage,
  whitelist: ['orgs', 'currentOrg']
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  org: persistReducer(orgPersistConfig, orgReducer),
  token: tokenReducer,
  user: userReducer,
  audit: auditReducer,
  notification: notificationReducer,
  route: routeReducer,
  app: appReducer,
  cloudFunction: cloudFunctionReducer,
  theme: themeReducer,
  integration: integrationReducer,
  aiAssistant: aiAssistantReducer, // Add aiAssistant reducer
  appMarketplace: appMarketplaceReducer,
  trigger: triggerReducer,
  scheduledJob: scheduledJobReducer,
  workflow: workflowReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
