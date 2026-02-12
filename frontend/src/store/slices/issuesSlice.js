import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchIssues as fetchIssuesApi, fetchIssueById as fetchIssueByIdApi, fetchNotFixedIssues as fetchNotFixedIssuesApi, fetchFixedIssues as fetchFixedIssuesApi } from '../../mocks/apiService';
import { NOT_FIXED_STATUSES, FIXED_STATUSES } from '../../utils/constants';

const initialState = {
  issues: [],
  currentIssue: null,
  loading: false,
  error: null,
  filters: {
    status: null,
    priority: null,
    site: null,
    search: '',
  },
};

export const fetchIssues = createAsyncThunk(
  'issues/fetchAll',
  async (user, { rejectWithValue }) => {
    try {
      const issues = await fetchIssuesApi(user);
      return issues;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchIssueById = createAsyncThunk(
  'issues/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const issue = await fetchIssueByIdApi(id);
      return issue;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const issuesSlice = createSlice({
  name: 'issues',
  initialState,
  reducers: {
    setIssues: (state, action) => {
      state.issues = action.payload;
    },
    setCurrentIssue: (state, action) => {
      state.currentIssue = action.payload;
    },
    updateIssueStatus: (state, action) => {
      const { id, status } = action.payload;
      const issue = state.issues.find(i => i.id === id);
      if (issue) {
        issue.status = status;
      }
      if (state.currentIssue?.id === id) {
        state.currentIssue.status = status;
      }
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentIssue: (state) => {
      state.currentIssue = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIssues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssues.fulfilled, (state, action) => {
        state.loading = false;
        state.issues = action.payload;
      })
      .addCase(fetchIssues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchIssueById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssueById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentIssue = action.payload;
      })
      .addCase(fetchIssueById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setIssues, setCurrentIssue, updateIssueStatus, setFilters, clearFilters, clearCurrentIssue } = issuesSlice.actions;

// Selectors
export const selectAllIssues = (state) => state.issues.issues;
export const selectCurrentIssue = (state) => state.issues.currentIssue;
export const selectIssuesLoading = (state) => state.issues.loading;
export const selectIssuesError = (state) => state.issues.error;
export const selectFilters = (state) => state.issues.filters;

// Filtered issues selector
export const selectFilteredIssues = (state) => {
  const { issues, filters } = state.issues;
  let filtered = [...issues];
  
  if (filters.status) {
    filtered = filtered.filter(i => i.status === filters.status);
  }
  if (filters.priority) {
    filtered = filtered.filter(i => i.priority === filters.priority);
  }
  if (filters.site) {
    filtered = filtered.filter(i => i.site_id === filters.site);
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(i => 
      i.title.toLowerCase().includes(search) ||
      i.description.toLowerCase().includes(search) ||
      i.id.toString().includes(search)
    );
  }
  
  // Sort: overdue first, then by priority, then by created_at
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return filtered.sort((a, b) => {
    const aOverdue = new Date(a.deadline_at) < new Date() && a.status !== 'COMPLETED';
    const bOverdue = new Date(b.deadline_at) < new Date() && b.status !== 'COMPLETED';
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
};

export const selectNotFixedIssues = (state) => {
  return selectFilteredIssues(state).filter(i => NOT_FIXED_STATUSES.includes(i.status));
};

export const selectFixedIssues = (state) => {
  return selectFilteredIssues(state).filter(i => FIXED_STATUSES.includes(i.status));
};

export default issuesSlice.reducer;
