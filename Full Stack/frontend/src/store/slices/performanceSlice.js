// src/store/slices/performanceSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { users } from '../../mocks/users';
import { solverSkills } from '../../mocks/solverSkills';
// ── FIX: Corrected the import name to match scoreEngine.js ──
import { calculateSolverScore } from '../../utils/scoreEngine';

/**
 * Return solver users visible to the current user.
 */
function getVisibleSolvers(user) {
  const allSolvers = users.filter(u => u.role === 'problem_solver');

  if (!user) return allSolvers;

  if (user.role === 'manager') {
    return allSolvers;
  }

  if (user.role === 'supervisor' && Array.isArray(user.sites)) {
    const siteIds = user.sites;
    const solverIds = [
      ...new Set(
        solverSkills
          .filter(s => siteIds.includes(s.site_id))
          .map(s => s.solver_id)
      ),
    ];
    return allSolvers.filter(s => solverIds.includes(s.id));
  }

  if (user.role === 'problem_solver') {
    return allSolvers.filter(s => s.id === user.id);
  }

  return allSolvers;
}

export const fetchSolversPerformance = createAsyncThunk(
  'performance/fetchSolvers',
  async (user, { rejectWithValue }) => {
    try {
      const solvers = getVisibleSolvers(user);

      const data = solvers.map(solver => {
        // ── FIX: Use the corrected function name here ──
        const perf = calculateSolverScore(solver.id);
        return {
          ...solver,
          performance: perf,
        };
      });

      return data;
    } catch (e) {
      console.error("Redux Thunk Error:", e); // Helps catch any future crashes!
      return rejectWithValue(e.message || 'Failed to load performance');
    }
  }
);

const performanceSlice = createSlice({
  name: 'performance',
  initialState: {
    solvers: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchSolversPerformance.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSolversPerformance.fulfilled, (state, action) => {
        state.loading = false;
        state.solvers = action.payload;
      })
      .addCase(fetchSolversPerformance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load performance';
      });
  },
});

export default performanceSlice.reducer;

// Selectors
export const selectPerformanceState = state => state.performance;

export const selectAllSolvers = createSelector(
  selectPerformanceState,
  s => s.solvers
);

export const selectPerformanceLoading = createSelector(
  selectPerformanceState,
  s => s.loading
);

export const selectSolverById = (state, id) =>
  state.performance.solvers.find(s => s.id === id) || null;