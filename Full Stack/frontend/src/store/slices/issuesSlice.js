import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchIssues as fetchIssuesApi, fetchIssueById as fetchIssueByIdApi , fetchIssueTimeline as fetchIssueTimelineApi } from '../../services/api';// Initial state

const initialState = {
  issues: [],
  currentIssue: null,
  loading: false,
  error: null,
  filters: {
    search: '',
    status: null,
    priority: null,
    site: null,
  },
};

export const fetchIssues = createAsyncThunk(
  'issues/fetchAll',
  async (user, { rejectWithValue }) => {
    try {
      const result = await fetchIssuesApi();
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.issues;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch issues');
    }
  }
);

export const fetchIssueById = createAsyncThunk(
  'issues/fetchById',
  async (issueId, { rejectWithValue }) => {
    try {
      const result = await fetchIssueByIdApi(issueId);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.issue;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch issue');
    }
  }
);

export const fetchIssueTimeline = createAsyncThunk(//new thunk for fetching issue timeline
  'issues/fetchTimeline',
  async (issueId, { rejectWithValue }) => {
    try {
      const result = await fetchIssueTimelineApi(issueId);

      if (!result.success) {
        return rejectWithValue('Failed to fetch timeline');
      }

      return result.timeline;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const issuesSlice = createSlice({
  name: 'issues',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentIssue: (state, action) => {
      state.currentIssue = action.payload;
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
        state.error = null;
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
        state.error = null;
      })
      .addCase(fetchIssueById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Timeline cases
      .addCase(fetchIssueTimeline.pending, (state) => {
      state.loading = true;
      })
      .addCase(fetchIssueTimeline.fulfilled, (state, action) => {
        state.loading = false;
        state.timeline = action.payload;
      })
      .addCase(fetchIssueTimeline.rejected, (state) => {
        state.loading = false;
      })
  },
});

export const { setFilters, clearFilters, setCurrentIssue, clearCurrentIssue } = issuesSlice.actions;

// Selectors
export const selectAllIssues = (state) => state.issues.issues;
export const selectCurrentIssue = (state) => state.issues.currentIssue;
export const selectIssuesLoading = (state) => state.issues.loading;
export const selectIssuesError = (state) => state.issues.error;
export const selectFilters = (state) => state.issues.filters;
export const selectIssueById = (state, issueId) => 
  state.issues.issues.find(issue => issue.id === issueId) || state.issues.currentIssue;

// Filtered selectors
export const selectFilteredIssues = (state) => {
  const { issues, filters } = state.issues;
  let filtered = [...issues];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(issue =>
      issue.title?.toLowerCase().includes(searchLower) ||
      issue.description?.toLowerCase().includes(searchLower) ||
      issue.id?.toString().includes(searchLower) ||
      issue.site?.name?.toLowerCase().includes(searchLower)
    );
  }

  // Status filter
  if (filters.status) {
    filtered = filtered.filter(issue => issue.status === filters.status);
  }

  // Priority filter
  if (filters.priority) {
    filtered = filtered.filter(issue => issue.priority === filters.priority);
  }

  return filtered;
};

// Status-based selectors
export const selectNotFixedIssues = (state) => {
  const notFixedStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED'];
  return state.issues.issues.filter(issue => notFixedStatuses.includes(issue.status));
};

export const selectFixedIssues = (state) => {
  return state.issues.issues.filter(issue => issue.status === 'COMPLETED');
};

export const selectEscalatedIssues = (state) => {
  return state.issues.issues.filter(issue => issue.status === 'ESCALATED');
};
export const selectIssueTimeline = (state) => state.issues.timeline;//new selector for issue timeline

export default issuesSlice.reducer;
