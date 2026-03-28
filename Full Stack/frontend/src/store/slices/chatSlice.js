import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchChatSessions,
  fetchSessionDetail,
} from '../../services/api';

const initialState = {
  messages: [],
  chatHistory: [],
  currentConversationId: null,
  historyLoading: false,      // 📍 FIX: Dedicated state for sidebar
  conversationLoading: false, // 📍 FIX: Dedicated state for main chat
  error: null,
  context: null,
};

export const loadChatHistory = createAsyncThunk(
  'chat/loadHistory',
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchChatSessions();
      if (!result.success) throw new Error();
      return result.sessions;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadConversation = createAsyncThunk(
  'chat/loadConversation',
  async (sessionId, { rejectWithValue }) => {
    try {
      const result = await fetchSessionDetail(sessionId);
      // 📍 FIX: Actually throw the error so the frontend can catch the 404
      if (!result.success) throw new Error(result.error || "Session not found");

      return {
        sessionId,
        messages: result.session.messages,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.currentConversationId = null;
    },
    startNewConversation: (state) => {
      state.messages = [];
      state.currentConversationId = null;  
    },
    setCurrentConversationId: (state, action) => {
      state.currentConversationId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── SIDEBAR LOADING ──
      .addCase(loadChatHistory.pending, (state) => {
        state.historyLoading = true;
      })
      .addCase(loadChatHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.chatHistory = action.payload;
      })
      .addCase(loadChatHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.payload;
      })
      // ── CONVERSATION LOADING ──
      .addCase(loadConversation.pending, (state) => {
        state.conversationLoading = true;
        state.messages = []; // 📍 FIX: Clear old messages instantly
      })
      .addCase(loadConversation.fulfilled, (state, action) => {
        state.conversationLoading = false;
        state.messages = action.payload.messages;
        state.currentConversationId = action.payload.sessionId;
      })
      .addCase(loadConversation.rejected, (state, action) => {
        state.conversationLoading = false;
        state.error = action.payload;
      });
  },
});

export const { addMessage, setMessages, setContext, clearMessages, startNewConversation , setCurrentConversationId } = chatSlice.actions;

// Selectors
export const selectAllMessages = (state) => state.chat.messages;
export const selectChatHistory = (state) => state.chat.chatHistory;
export const selectCurrentConversationId = (state) => state.chat.currentConversationId;
// 📍 FIX: Exporting the new separated loading states
export const selectHistoryLoading = (state) => state.chat.historyLoading;
export const selectConversationLoading = (state) => state.chat.conversationLoading;
export const selectContext = (state) => state.chat.context;

export default chatSlice.reducer;