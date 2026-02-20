// src/store/slices/chatSlice.js

import { createSlice } from '@reduxjs/toolkit';

// ══════════════════════════════════════════════════
// INITIAL STATE
// ══════════════════════════════════════════════════

const initialState = {
  messages: [],
  sending: false,
  loading: false,
  error: null,
};

// ══════════════════════════════════════════════════
// SLICE (no async thunks — chat.js calls API directly)
// ══════════════════════════════════════════════════

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Add a single message (user or AI)
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },

    // Add user message
    addUserMessage: (state, action) => {
      state.messages.push({
        id: Date.now(),
        role: 'user',
        message: action.payload.message,
        userName: action.payload.userName || 'You',
        createdAt: new Date().toISOString(),
      });
    },

    // Add AI response
    addAIMessage: (state, action) => {
      // Remove typing indicator first
      state.messages = state.messages.filter((m) => !m.isTyping);
      state.messages.push({
        id: Date.now() + 1,
        role: 'ai',
        message: action.payload.message,
        intent: action.payload.intent || null,
        createdAt: new Date().toISOString(),
      });
      state.sending = false;
    },

    // Add typing indicator
    setTyping: (state) => {
      state.sending = true;
      state.messages.push({
        id: 'typing',
        role: 'ai',
        message: '⏳ Thinking...',
        isTyping: true,
        createdAt: new Date().toISOString(),
      });
    },

    // Remove typing indicator on error
    setError: (state, action) => {
      state.sending = false;
      state.messages = state.messages.filter((m) => !m.isTyping);
      state.messages.push({
        id: Date.now() + 2,
        role: 'ai',
        message: `❌ ${action.payload || 'Something went wrong'}`,
        createdAt: new Date().toISOString(),
      });
      state.error = action.payload;
    },

    // Load history from backend
    setMessages: (state, action) => {
      state.messages = action.payload;
      state.loading = false;
    },

    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    // Clear all messages
    clearChat: (state) => {
      state.messages = [];
      state.error = null;
      state.sending = false;
      state.loading = false;
    },

    // Clear error only
    clearError: (state) => {
      state.error = null;
    },
  },
});

// ══════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════

export const {
  addMessage,
  addUserMessage,
  addAIMessage,
  setTyping,
  setError,
  setMessages,
  setLoading,
  clearChat,
  clearError,
} = chatSlice.actions;

// ══════════════════════════════════════════════════
// SELECTORS (all properly accept state)
// ══════════════════════════════════════════════════

export const selectMessages = (state) => state.chat.messages;
export const selectChatSending = (state) => state.chat.sending;
export const selectChatLoading = (state) => state.chat.loading;
export const selectChatError = (state) => state.chat.error;

// ══════════════════════════════════════════════════
// REDUCER
// ══════════════════════════════════════════════════

export default chatSlice.reducer;