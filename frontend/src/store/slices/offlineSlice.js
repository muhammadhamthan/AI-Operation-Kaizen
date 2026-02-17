import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOnline: true,
  lastChecked: null,
  pendingActions: [],
  lastSyncTime: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
      state.lastChecked = new Date().toISOString();
    },
    addPendingAction: (state, action) => {
      state.pendingActions.push({
        ...action.payload,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
      });
    },
    removePendingAction: (state, action) => {
      state.pendingActions = state.pendingActions.filter(
        a => a.id !== action.payload
      );
    },
    incrementRetryCount: (state, action) => {
      const pendingAction = state.pendingActions.find(
        a => a.id === action.payload
      );
      if (pendingAction) {
        pendingAction.retryCount += 1;
      }
    },
    clearSyncedActions: (state) => {
      state.pendingActions = [];
      state.lastSyncTime = new Date().toISOString();
    },
  },
});

export const {
  setOnlineStatus,
  addPendingAction,
  removePendingAction,
  incrementRetryCount,
  clearSyncedActions,
} = offlineSlice.actions;

// Selectors
export const selectIsOnline = (state) => state.offline.isOnline;
export const selectPendingActions = (state) => state.offline.pendingActions;
export const selectLastSyncTime = (state) => state.offline.lastSyncTime;

export default offlineSlice.reducer;
