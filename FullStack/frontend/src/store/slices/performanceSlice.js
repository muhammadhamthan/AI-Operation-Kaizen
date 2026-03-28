import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
// import { users } from '../../mocks/users';
// import { solverSkills } from '../../mocks/solverSkills';
// import { calculateSolverScore } from '../../utils/scoreEngine';
// import { supervisorSites } from "../../mocks/supervisorSites";
import { fetchSolversPerformanceAPI } from '../../services/api';

function getVisibleSolvers(user) {
  // Fix role typo
  const allSolvers = users.filter(u => u.role === 'problem_solver'); 
  if (!user) return [];
  if (user.role === 'manager') return allSolvers;

  if (user.role === 'supervisor') {
    const siteIds = supervisorSites
      .filter(ss => ss.supervisor_id === user.id)
      .map(ss => ss.site_id);

    if (siteIds.length === 0) return [];

    const solverIds = [
      ...new Set(
        solverSkills
          .filter(s => siteIds.includes(s.site_id)) // Fix site_id typo
          .map(s => s.solver_id)
      ),
    ];
    return allSolvers.filter(s => solverIds.includes(s.id));
  }

  // Fix role typo
  if (user.role === 'problem_solver') { 
    return allSolvers.filter(s => s.id === user.id);
  }

  return allSolvers;
}

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
        state.solvers = action.payload;
      })
      .addCase(fetchSolversPerformance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load performance';
      });
  },
});

export default performanceSlice.reducer;

export const selectPerformanceState = state => state.performance;
export const selectAllSolvers = createSelector(selectPerformanceState, s => s.solvers);
export const selectPerformanceLoading = createSelector(selectPerformanceState, s => s.loading);
export const selectSolverById = (state, id) =>
  state.performance.solvers.find(s => s.id === id) || null;