import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import issuesReducer from './slices/issuesSlice';
import complaintsReducer from './slices/complaintsSlice';
import chatReducer from './slices/chatSlice';
import dashboardReducer from './slices/dashboardSlice';
import notificationsReducer from './slices/notificationsSlice';
import offlineReducer from './slices/offlineSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    issues: issuesReducer,
    complaints: complaintsReducer,
    chat: chatReducer,
    dashboard: dashboardReducer,
    notifications: notificationsReducer,
    offline: offlineReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
