import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDashboardStats as fetchDashboardDataApi } from '../../services/api';
import { normaliseRole, ROLES } from '../../utils/roles';

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
  async (user, { rejectWithValue }) => {
    try {
      const result = await fetchDashboardDataApi();
      console.log("Dashboard API Result:", result);
      if (!result.success) return rejectWithValue(result.error);
      
      // We pass the user object along to the fulfilled case for role-based mapping
      return { data: result.data, user };
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
        const { data, user } = action.payload;
        const role = normaliseRole(user?.role);
        
        state.loading = false;
        state.isSolverView = role === ROLES.PROBLEM_SOLVER;

        if (state.isSolverView) {
          // 🛠️ SOLVER MAPPING
          state.stats = {
            totalIssues: (data.total_active || 0) + (data.total_completed || 0),
            notFixedIssues: data.total_active || 0,
            fixedIssues: data.total_completed || 0,
            complaints: data.complaints_against || 0,
          };
          
          state.alerts = {
            escalations: 0,
            deadlines: 0, // Could be calculated from assignments if needed
            pendingReviews: 0
          };

          state.recentIssues = (data.active_assignments || []).map(a => ({
            id: a.issue_id,
            title: a.issue_title,
            site_name: a.site_name,
            status: 'assigned',
            priority: a.priority,
            due_date: a.due_date,
            created_at: a.due_date, // Fallback
          }));

          // 📊 PIE CHART for Solver
          state.charts.issuesByCategory = [
            { name: 'Active Tasks', count: data.total_active, color: '#3b82f6' },
            { name: 'Completed', count: data.total_completed, color: '#10a37f' }
          ].filter(item => item.count > 0);

        } else {
          // 🛠️ MANAGER / SUPERVISOR MAPPING
          const summary = data.summary || {};
          
          state.stats = {
            totalIssues: summary.total_issues || 0,
            notFixedIssues: (summary.open_issues || 0) + 
                            (summary.assigned_issues || 0) + 
                            (summary.in_progress_issues || 0) + 
                            (summary.reopened_issues || 0),
            fixedIssues: summary.completed_issues || 0,
            complaints: 0, // Total complaints not directly in summary
          };

          state.alerts = {
            escalations: data.active_escalations || 0,
            deadlines: data.issues_approaching_deadline || data.overdue_issues || 0,
            pendingReviews: data.pending_reviews || summary.resolved_pending_review || 0
          };

          state.recentIssues = data.recent_issues || [];

          // 📊 PIE CHART for Manager/Supervisor
          state.charts.issuesByCategory = [
            { name: 'Open', count: summary.open_issues || 0, color: '#3b82f6' },
            { name: 'In Progress', count: (summary.in_progress_issues || 0) + (summary.assigned_issues || 0), color: '#8b5cf6' },
            { name: 'Completed', count: summary.completed_issues || 0, color: '#10a37f' },
            { name: 'Escalated', count: summary.escalated_issues || 0, color: '#ef4444' }
          ].filter(item => item.count > 0);
        }

        // 📈 DYNAMIC LINE CHART
        const dayCounts = {};
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        if (state.recentIssues.length > 0) {
          state.recentIssues.forEach(issue => {
            const dateStr = state.isSolverView ? (issue.due_date || issue.created_at) : (issue.created_at || issue.updated_at);
            if (dateStr) {
              const date = new Date(dateStr);
              const dayName = daysOfWeek[date.getDay()];
              dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
            }
          });
        }

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
});const EMPTY_ARRAY = [];

// ✅ ADDED selectIsSolverView EXPORT
export const selectIsSolverView = (state) => state.dashboard?.isSolverView || false;
export const selectStats = (state) => state.dashboard?.stats || initialState.stats;
export const selectAlerts = (state) => state.dashboard?.alerts || initialState.alerts;
export const selectRecentIssues = (state) => state.dashboard?.recentIssues || EMPTY_ARRAY;
export const selectCharts = (state) => state.dashboard?.charts || initialState.charts;
export const selectDashboardLoading = (state) => state.dashboard?.loading || false;

export default dashboardSlice.reducer;