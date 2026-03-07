import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
// import { sites } from '../../mocks/sites';
// import { issues } from '../../mocks/issues';
// import { complaints } from '../../mocks/complaints';
// import { solverSkills } from '../../mocks/solverSkills';
// import { getUserById } from '../../mocks/users';
import { fetchSitesAnalytics } from '../../services/api';


const now = () => new Date();

function computeSiteAnalytics(siteId) {
  // ✅ REVERTED TO SNAKE CASE: site_id
  const siteIssues = issues.filter(i => i.site_id === siteId);

  // ✅ REVERTED TO SNAKE CASE: issue_id, site_id
  const siteComplaints = complaints.filter(c => {
    const issue = issues.find(i => i.id === c.issue_id);
    return issue?.site_id === siteId;
  });

  const totalIssues = siteIssues.length;
  const openIssues = siteIssues.filter(i => i.status === 'OPEN').length;
  // ✅ FIXED: IN_PROGRESS
  const inProgressIssues = siteIssues.filter(i => i.status === 'IN_PROGRESS').length;
  const completedIssues = siteIssues.filter(i => i.status === 'COMPLETED').length;
  const escalatedIssues = siteIssues.filter(i => i.status === 'ESCALATED').length;
  const reopenedIssues = siteIssues.filter(i => i.status === 'REOPENED').length;

  const overdueIssues = siteIssues.filter(i => {
    if (i.status === 'COMPLETED') return false;
    // ✅ REVERTED TO SNAKE CASE: deadline_at (checking due_date too just in case)
    const due = i.deadline_at || i.due_date;
    if (!due) return false;
    return new Date(due) < now();
  });
  const overdueCount = overdueIssues.length;
  const complaintsCount = siteComplaints.length;

  // --- SOFTER SCORING LOGIC ---
  let siteScore = 100;
  
  if (totalIssues > 0) {
    // 1. Calculate penalties for bad indicators
    const penalty = (overdueCount * 5) + (escalatedIssues * 5) + (complaintsCount * 10);
    
    // 2. Give a small 2-point bonus for every completed issue to offset penalties
    const bonus = completedIssues * 2;
    
    // 3. Start at 100, subtract penalties, add bonuses (keep between 0 and 100)
    siteScore = Math.max(0, Math.min(100, Math.round(100 - penalty + bonus)));
  }

  // Adjusted health thresholds to be a bit more forgiving
  let health = 'Healthy';
  if (siteScore < 50) {
    health = 'Critical';
  } else if (siteScore < 80) {
    health = 'Needs Attention';
  }
  
  // ✅ REVERTED TO SNAKE CASE: site_id, solver_id
  const uniqueSolverIds = [...new Set(
    solverSkills
      .filter(s => s.site_id === siteId)
      .map(s => s.solver_id)
  )];

  const solversForSite = uniqueSolverIds.map(id => {
    const user = getUserById(id);
    return { id, name: user?.name || `Solver ${id}`, avatar: user?.avatar };
  });

  return {
    totalIssues,
    openIssues,
    inProgressIssues,
    completedIssues,
    escalatedIssues,
    reopenedIssues,
    overdueCount,
    complaintsCount,
    score: siteScore,
    health,
    solvers: solversForSite,
  };
}

export const fetchSitesWithAnalytics = createAsyncThunk(
  'sites/fetchWithAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchSitesAnalytics();

      if (!res.success) {
        return rejectWithValue(res.error);
      }

      return res.sites;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

const sitesSlice = createSlice({
  name: 'sites',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchSitesWithAnalytics.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSitesWithAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSitesWithAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load sites';
      });
  },
});

export default sitesSlice.reducer;
export const selectSitesState = state => state.sites;
export const selectAllSites = createSelector(selectSitesState, s => s.items);
export const selectSitesLoading = createSelector(selectSitesState, s => s.loading);
export const selectSiteById = (state, id) => state.sites.items.find(s => s.id === id) || null;