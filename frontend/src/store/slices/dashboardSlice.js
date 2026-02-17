import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDashboardStats as fetchDashboardStatsApi } from '../../services/api';

const initialState = {
  stats: {
    totalIssues: 0,
    notFixedIssues: 0,
    fixedIssues: 0,
    complaints: 0,
  },
  charts: {
    issuesTrend: [
      { day: 'Mon', issues: 3 },
      { day: 'Tue', issues: 5 },
      { day: 'Wed', issues: 4 },
      { day: 'Thu', issues: 2 },
      { day: 'Fri', issues: 6 },
      { day: 'Sat', issues: 1 },
      { day: 'Sun', issues: 1 },
    ],
    issuesByCategory: [
      { name: 'Electrical', count: 8, color: '#3b82f6' },
      { name: 'Plumbing', count: 5, color: '#8b5cf6' },
      { name: 'Safety', count: 4, color: '#ef4444' },
      { name: 'HVAC', count: 3, color: '#f97316' },
      { name: 'Other', count: 2, color: '#6b7280' },
    ],
    sitePerformance: [
      { site: 'Guindy', completed: 12, pending: 3 },
      { site: 'Taramani', completed: 8, pending: 5 },
      { site: 'Ambattur', completed: 6, pending: 4 },
      { site: 'Vepery', completed: 10, pending: 2 },
      { site: 'Perungudi', completed: 7, pending: 6 },
    ],
  },
  loading: false,
  error: null,
};

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (user, { rejectWithValue }) => {
    try {
      const result = await fetchDashboardStatsApi();
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.stats;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch dashboard data');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setStats: (state, action) => {
      state.stats = action.payload;
    },
    setCharts: (state, action) => {
      state.charts = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setStats, setCharts } = dashboardSlice.actions;

// Selectors
export const selectStats = (state) => state.dashboard.stats;
export const selectCharts = (state) => state.dashboard.charts;
export const selectDashboardLoading = (state) => state.dashboard.loading;
export const selectDashboardError = (state) => state.dashboard.error;

export default dashboardSlice.reducer;
