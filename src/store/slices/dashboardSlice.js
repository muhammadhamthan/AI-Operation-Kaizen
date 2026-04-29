import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDashboardStats as fetchDashboardDataApi } from '../../services/api';

const initialState = {
  isSolverView: false, // ✅ ADDED THIS
  stats: {
    totalIssues: 0,
    notFixedIssues: 0,
    fixedIssues: 0,
    complaints: 0,
  },
  alerts: {
    escalations: 0,
    deadlines: 0,
    pendingReviews: 0
  },
  recentIssues: [],
  charts: {
    issuesTrend: [],
    issuesByCategory: [],
    sitePerformance: [],
  },
  loading: false,
  error: null,
};

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchDashboardDataApi();
      console.log("Dashboard API Result:", result);
      if (!result.success) return rejectWithValue(result.error);
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        const payload = action.payload;

        state.loading = false;
        state.isSolverView = payload.isSolverView || false; // ✅ ADDED THIS
        state.stats = payload.stats;
        state.alerts = payload.alerts || initialState.alerts;
        state.recentIssues = payload.recentIssues || [];

        // 📊 DYNAMIC PIE CHART (✅ ADDED IF/ELSE TO PREVENT CRASH)
        if (payload.isSolverView) {
          // Solver Pie Chart (Active vs Completed)
          state.charts.issuesByCategory = [
            { name: 'Active Tasks', count: payload.stats.notFixedIssues, color: '#3b82f6' },
            { name: 'Completed', count: payload.stats.fixedIssues, color: '#10a37f' }
          ].filter(item => item.count > 0);
        } else {
          // Manager/Supervisor Pie Chart
          const summary = payload.rawSummary || {};
          // ✅ Mapping specifically to the snake_case keys in your JSON
          state.charts.issuesByCategory = [
            { name: 'Open', count: summary.open_issues || 0, color: '#3b82f6' },
            { name: 'In Progress', count: (summary.in_progress_issues || 0) + (summary.assigned_issues || 0), color: '#8b5cf6' },
            { name: 'Completed', count: summary.completed_issues || 0, color: '#10a37f' },
            { name: 'Escalated', count: summary.escalated_issues || 0, color: '#ef4444' }
          ].filter(item => item.count > 0);
        }

        // 📈 DYNAMIC LINE CHART (Same for both roles)
        const dayCounts = {};
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        if (payload.recentIssues && payload.recentIssues.length > 0) {
          payload.recentIssues.forEach(issue => {
            if (issue.created_at) {
              const date = new Date(issue.created_at);
              const dayName = daysOfWeek[date.getDay()];
              dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
            }
          });
        }

        // Map to expected chart format
        state.charts.issuesTrend = Object.keys(dayCounts).map(day => ({
          day,
          created: dayCounts[day]
        }));
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// ✅ ADDED selectIsSolverView EXPORT
export const selectIsSolverView = (state) => state.dashboard.isSolverView;
export const selectStats = (state) => state.dashboard.stats;
export const selectAlerts = (state) => state.dashboard.alerts;
export const selectRecentIssues = (state) => state.dashboard.recentIssues;
export const selectCharts = (state) => state.dashboard.charts;
export const selectDashboardLoading = (state) => state.dashboard.loading;

export default dashboardSlice.reducer;