import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchChatSessions,
  fetchSessionDetail,
} from '../../services/api';
const initialState = {
  messages: [],
  chatHistory: [],
  currentConversationId: null,
  loading: false,
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
      if (!result.success) throw new Error();

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
      state.currentConversationId = null;  // 🔥 important
    },

    // ✅ ADD THIS
    setCurrentConversationId: (state, action) => {
      state.currentConversationId = action.payload;
    },

  },
  extraReducers: (builder) => {
    builder
      .addCase(loadChatHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadChatHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.chatHistory = action.payload;
      })
      .addCase(loadChatHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadConversation.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.messages;
        state.currentConversationId = action.payload.conversationId;
      })
      .addCase(loadConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { addMessage, setMessages, setContext, clearMessages, startNewConversation , setCurrentConversationId } = chatSlice.actions;

// Selectors
export const selectAllMessages = (state) => state.chat.messages;
export const selectChatHistory = (state) => state.chat.chatHistory;
export const selectCurrentConversationId = (state) => state.chat.currentConversationId;
export const selectChatLoading = (state) => state.chat.loading;
export const selectContext = (state) => state.chat.context;

export default chatSlice.reducer;