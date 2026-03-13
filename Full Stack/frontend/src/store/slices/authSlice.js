import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  loginUser as loginUserApi, 
  logoutUser as logoutUserApi,
  getStoredUser,
  isAuthenticated as checkAuthToken // ✅ Imported to quickly check disk
} from '../../services/api'; 

const initialState = {
  isInitialized: false, // ✅ NEW: Tracks if we've checked local storage
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      console.log('🔍 Thunk calling loginUserApi...');
      const result = await loginUserApi(username, password);
      console.log('🔍 Thunk received:', JSON.stringify(result));
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result;
    } catch (error) {
      console.log('🔍 Thunk caught error:', error.message);
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

// ✅ OPTIMISTIC HYDRATION: Check disk (fast), don't wait for server (slow)
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const hasToken = await checkAuthToken();
      const storedUser = await getStoredUser();
      
      if (hasToken && storedUser) {
        // Boom! We have a user on disk. Log them in instantly.
        return { user: storedUser };
      }
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    await logoutUserApi();
    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
        state.isAuthenticated = false;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
        } else {
          state.isAuthenticated = false;
        }
        state.isInitialized = true; // ✅ Done checking storage
        state.loading = false;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isAuthenticated = false;
        state.isInitialized = true; // ✅ Done checking storage, even if it failed
        state.loading = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
        // Note: isInitialized stays true because the app is already booted up
      });
  },
});

export const { setUser, setLoading, setError, clearError } = authSlice.actions;

// Selectors
export const selectIsInitialized = (state) => state.auth.isInitialized; // ✅ NEW Selector for layout
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectCurrentUser = (state) => state.auth.user;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthToken = (state) => state.auth.token;

export default authSlice.reducer;
