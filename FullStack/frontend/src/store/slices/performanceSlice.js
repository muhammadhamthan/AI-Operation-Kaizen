import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { fetchSolversPerformanceAPI } from '../../services/api';

export const fetchSolversPerformance = createAsyncThunk(
  'performance/fetchSolvers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchSolversPerformanceAPI();
      return res.solvers;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

const performanceSlice = createSlice({
  name: 'performance',
  initialState: { solvers: [], loading: false, error: null },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchSolversPerformance.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSolversPerformance.fulfilled, (state, action) => {
        state.loading = false;
        state.solvers = action.payload || [];
      })
      .addCase(fetchSolversPerformance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load performance';
      });
  },
});

export default performanceSlice.reducer;

export const selectPerformanceState = state => state.performance || { solvers: [], loading: false };
export const selectAllSolvers = createSelector(selectPerformanceState, s => s?.solvers || []);
export const selectPerformanceLoading = createSelector(selectPerformanceState, s => s?.loading || false);
export const selectSolverById = (state, id) =>
  (state.performance?.solvers || []).find(s => s.id === id) || null;