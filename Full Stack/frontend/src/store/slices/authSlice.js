// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import { 
//   loginUser as loginUserApi, 
//   logoutUser as logoutUserApi,
//   getStoredUser,
//   getCurrentUser,
// } from '../../mocks/apiService';  // From slices/ → ../../mocks/

// const initialState = {
//   isAuthenticated: false,
//   user: null,
//   token: null,
//   loading: false,
//   error: null,
// };

// export const loginUser = createAsyncThunk(
//   'auth/login',
//   async ({ username, password }, { rejectWithValue }) => {
//     try {
//       console.log('🔍 Thunk calling loginUserApi...');
//       const result = await loginUserApi(username, password);
//       console.log('🔍 Thunk received:', JSON.stringify(result));
//       if (!result.success) {
//         return rejectWithValue(result.error);
//       }
//       return result;
//     } catch (error) {
//       console.log('🔍 Thunk caught error:', error.message);
//       return rejectWithValue(error.message || 'Login failed');
//     }
//   }
// );
// export const checkAuthStatus = createAsyncThunk(
//   'auth/checkStatus',
//   async (_, { rejectWithValue }) => {
//     try {
//       // First check stored user
//       const storedUser = await getStoredUser();
//       if (storedUser) {
//         // Verify with server
//         const result = await getCurrentUser();
//         if (result.success) {
//           return { user: result.user };
//         }
//       }
//       return null;
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   }
// );

// export const logoutUser = createAsyncThunk(
//   'auth/logout',
//   async () => {
//     await logoutUserApi();
//     return null;
//   }
// );

// const authSlice = createSlice({
//   name: 'auth',
//   initialState,
//   reducers: {
//     setUser: (state, action) => {
//       state.user = action.payload;
//       state.isAuthenticated = !!action.payload;
//     },
//     setLoading: (state, action) => {
//       state.loading = action.payload;
//     },
//     setError: (state, action) => {
//       state.error = action.payload;
//     },
//     clearError: (state) => {
//       state.error = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(loginUser.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(loginUser.fulfilled, (state, action) => {
//         state.loading = false;
//         state.user = action.payload.user;
//         state.token = action.payload.token;
//         state.isAuthenticated = true;
//         state.error = null;
//       })
//       .addCase(loginUser.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload || 'Login failed';
//         state.isAuthenticated = false;
//       })
//       .addCase(checkAuthStatus.fulfilled, (state, action) => {
//         if (action.payload) {
//           state.user = action.payload.user;
//           state.isAuthenticated = true;
//         } else {
//           state.isAuthenticated = false;
//         }
//         state.loading = false;
//       })
//       .addCase(checkAuthStatus.rejected, (state) => {
//         state.loading = false;
//         state.isAuthenticated = false;
//       })
//       .addCase(logoutUser.fulfilled, (state) => {
//         state.user = null;
//         state.token = null;
//         state.isAuthenticated = false;
//         state.loading = false;
//         state.error = null;
//       });
//   },
// });

// export const { setUser, setLoading, setError, clearError } = authSlice.actions;

// // Selectors
// export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
// export const selectCurrentUser = (state) => state.auth.user;
// export const selectUserRole = (state) => state.auth.user?.role;
// export const selectAuthLoading = (state) => state.auth.loading;
// export const selectAuthError = (state) => state.auth.error;
// export const selectAuthToken = (state) => state.auth.token;

// export default authSlice.reducer;


import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: true,   // ✅ Always authenticated
  user: {
    id: 1,
    name: "Priya Sharma",
    email:"priya.sharma@example.com",
    phone: "9000000001",
    role: "supervisor",  // change to supervisor / problem_solver if needed
  },
  token: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
});

export const { setUser } = authSlice.actions;

export const loginUser = async () => {
  return { success: true };
};

// Selectors
export const selectIsAuthenticated = (state) => true; // always true
export const selectCurrentUser = (state) => state.auth.user;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectAuthLoading = () => false;
export const selectAuthError = () => null;
export const selectAuthToken = () => null;

export default authSlice.reducer;
