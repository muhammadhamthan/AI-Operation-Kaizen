import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOnline: true,
  pendingActions: [],
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    addPendingAction: (state, action) => {
      state.pendingActions.push(action.payload);
    },
    removePendingAction: (state, action) => {
      state.pendingActions = state.pendingActions.filter(a => a.id !== action.payload);
    },
    clearPendingActions: (state) => {
      state.pendingActions = [];
    },
  },
});

export const { setOnlineStatus, addPendingAction, removePendingAction, clearPendingActions } = offlineSlice.actions;

// Selectors
export const selectIsOnline = (state) => state.offline.isOnline;
export const selectPendingActions = (state) => state.offline.pendingActions;

export default offlineSlice.reducer;
