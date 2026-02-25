import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import issuesReducer from './slices/issuesSlice';
import complaintsReducer from './slices/complaintsSlice';
import chatReducer from './slices/chatSlice';
import dashboardReducer from './slices/dashboardSlice';
import notificationsReducer from './slices/notificationsSlice';
import offlineReducer from './slices/offlineSlice';

import sitesReducer from './slices/sitesSlice';
import performanceReducer from './slices/performanceSlice';

// 1. Combine all your reducers into one app-level reducer
const appReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  issues: issuesReducer,
  complaints: complaintsReducer,
  chat: chatReducer,
  dashboard: dashboardReducer,
  notifications: notificationsReducer,
  offline: offlineReducer,
  sites: sitesReducer,
  performance: performanceReducer,
});

// 2. Wrap it in a root reducer to intercept actions
const rootReducer = (state, action) => {
  // Listen specifically for the fulfilled logout thunk
  if (action.type === 'auth/logout/fulfilled') {
    // Optional but good UX: Save the user's theme choice before nuking the state
    const { theme } = state;

    // Setting state to an object containing only the theme forces EVERY 
    // other slice (chat, dashboard, issues, etc.) back to its pure initialState.
    state = { theme };
  }

  return appReducer(state, action);
};

// 3. Feed the root wrapper into the store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;