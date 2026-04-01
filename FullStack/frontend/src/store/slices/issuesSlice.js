import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchIssues as fetchIssuesApi, fetchIssueById as fetchIssueByIdApi , fetchIssueTimeline as fetchIssueTimelineApi } from '../../services/api';

// Initial state
const initialState = {
  issues: [],
  currentIssue: null,
  timeline: [], // New state for issue timeline
  loading: false,
  loadingMore: false, // 📍 NEW: For cursor pagination loading indicator
  nextCursor: null,   // 📍 NEW: Store the opaque cursor string
  hasMore: true,      // 📍 NEW: Stop condition tracker
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
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().issues;
      
      // Determine if we are doing a fresh load or an infinite scroll append
      const isReset = params?.reset !== false;
      
      // Stop condition: if scrolling and no more items, abort safely
      if (!isReset && !state.hasMore) {
        return rejectWithValue('No more items');
      }

      // Pass the cursor only if we are appending items
      const apiParams = {
        ...state.filters,
        limit: 10,
        cursor: isReset ? null : state.nextCursor, 
      };

      const result = await fetchIssuesApi(apiParams);
      
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      
      return {
        issues: result.issues,
        next_cursor: result.next_cursor,
        has_more: result.has_more,
        isReset: isReset
      };
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

export const fetchIssueTimeline = createAsyncThunk(
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
      .addCase(fetchIssues.pending, (state, action) => {
        // Trigger full screen loader vs bottom spinner based on the reset flag
        const isReset = action.meta.arg?.reset !== false;
        if (isReset) {
          state.loading = true;
        } else {
          state.loadingMore = true;
        }
        state.error = null;
      })
      .addCase(fetchIssues.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = null;
        
        if (action.payload.isReset) {
          // Fresh load: overwrite existing issues
          state.issues = action.payload.issues;
        } else {
          // Infinite Scroll: Safely append new issues, filtering duplicates
          const existingIds = new Set(state.issues.map(i => i.id));
          const newItems = action.payload.issues.filter(i => !existingIds.has(i.id));
          state.issues = [...state.issues, ...newItems];
        }

        // 📍 Always update cursor and stop conditions after a successful fetch
        state.nextCursor = action.payload.next_cursor;
        state.hasMore = action.payload.has_more;
      })
      .addCase(fetchIssues.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        
        // Ignore the rejection if it was deliberately stopped by the stop condition
        if (action.payload !== 'No more items') {
          state.error = action.payload;
        }
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
export const selectIssuesLoadingMore = (state) => state.issues.loadingMore; // 📍 NEW Selector
export const selectHasMoreIssues = (state) => state.issues.hasMore; // 📍 NEW Selector
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

export const selectAwaitingReviewIssues = (state) => {
  return state.issues.issues.filter(issue => issue.status === 'RESOLVED_PENDING_REVIEW');
};

export const selectEscalatedIssues = (state) => {
  return state.issues.issues.filter(issue => issue.status === 'ESCALATED');
};
export const selectIssueTimeline = (state) => state.issues.timeline; //new selector for issue timeline

export default issuesSlice.reducer;