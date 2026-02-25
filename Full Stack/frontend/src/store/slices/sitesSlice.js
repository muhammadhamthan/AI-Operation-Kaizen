// src/store/slices/sitesSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { sites } from '../../mocks/sites';
import { issues } from '../../mocks/issues';
import { complaints } from '../../mocks/complaints';
import { solverSkills } from '../../mocks/solverSkills';
import { getUserById } from '../../mocks/users';

const now = () => new Date();

function computeSiteAnalytics(siteId) {
  const siteIssues = issues.filter(i => i.site_id === siteId);
  const siteComplaints = complaints.filter(c => {
    const issue = issues.find(i => i.id === c.issue_id);
    return issue?.site_id === siteId;
  });

  const totalIssues = siteIssues.length;
  const openIssues = siteIssues.filter(i => i.status === 'OPEN').length;
  const inProgressIssues = siteIssues.filter(i => i.status === 'IN_PROGRESS').length;
  const completedIssues = siteIssues.filter(i => i.status === 'COMPLETED').length;
  const escalatedIssues = siteIssues.filter(i => i.status === 'ESCALATED').length;
  const reopenedIssues = siteIssues.filter(i => i.status === 'REOPENED').length;

  const overdueIssues = siteIssues.filter(i => {
    if (i.status === 'COMPLETED') return false;
    if (!i.deadline_at) return false;
    return new Date(i.deadline_at) < now();
  });
  const overdueCount = overdueIssues.length;
  const complaintsCount = siteComplaints.length;

  let siteScore = 100;
  if (totalIssues > 0) {
    const completionRate = (completedIssues / totalIssues) * 100;
    const penalty = (overdueCount * 5) + (escalatedIssues * 5) + (complaintsCount * 10);
    siteScore = Math.max(0, Math.round(completionRate - penalty));
  } else {
    siteScore = 100;
  }

  let health = 'Healthy';
  if (siteScore < 50) {
    health = 'Critical';
  } else if (siteScore < 80) {
    health = 'Needs Attention';
  }

  const uniqueSolverIds = [...new Set(
    solverSkills
      .filter(s => s.site_id === siteId)
      .map(s => s.solver_id)
  )];

  const solversForSite = uniqueSolverIds.map(id => {
    const user = getUserById(id); 
    return { id, name: user?.name || `Solver ${id}` };
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
  async (user, { rejectWithValue }) => {
    try {
      let visibleSites = [...sites];

      if (user?.role === 'supervisor' && Array.isArray(user.sites)) {
        visibleSites = sites.filter(s => user.sites.includes(s.id));
      }

      // ── FIX: Changed to 'problem_solver' ──
      if (user?.role === 'problem_solver') {
        const skillEntries = solverSkills.filter(s => s.solver_id === user.id);
        const siteIds = [...new Set(skillEntries.map(s => s.site_id))];
        visibleSites = sites.filter(s => siteIds.includes(s.id));
      }

      const enriched = visibleSites.map(site => ({
        ...site,
        analytics: computeSiteAnalytics(site.id),
      }));

      return enriched;
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to load sites');
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
        state.loading = true; state.error = null;
      })
      .addCase(fetchSitesWithAnalytics.fulfilled, (state, action) => {
        state.loading = false; state.items = action.payload;
      })
      .addCase(fetchSitesWithAnalytics.rejected, (state, action) => {
        state.loading = false; state.error = action.payload || 'Failed to load sites';
      });
  },
});

export default sitesSlice.reducer;
export const selectSitesState = state => state.sites;
export const selectAllSites = createSelector(selectSitesState, s => s.items);
export const selectSitesLoading = createSelector(selectSitesState, s => s.loading);
export const selectSiteById = (state, id) => state.sites.items.find(s => s.id === id) || null;