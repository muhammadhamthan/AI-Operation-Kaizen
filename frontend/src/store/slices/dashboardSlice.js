import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDashboardData as fetchDashboardDataApi } from '../../mocks/apiService';

const initialState = {
  stats: {
    totalIssues: 0,
    notFixedIssues: 0,
    fixedIssues: 0,
    complaints: 0,
  },
  charts: {
    trend: [],
    issueTypes: [],
    sitesComparison: [],
  },
  loading: false,
  error: null,
};

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (user, { rejectWithValue }) => {
    try {
      const data = await fetchDashboardDataApi(user);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
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
        state.stats = action.payload.stats;
        state.charts = action.payload.charts;
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
