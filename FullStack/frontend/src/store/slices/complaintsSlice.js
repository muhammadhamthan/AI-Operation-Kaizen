import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import {
  fetchComplaints as fetchComplaintsApi,
  fetchComplaintById as fetchComplaintByIdApi,
} from '../../services/api';

const initialState = {
  complaints: [],
  currentComplaint: null,        // ✅ ADD
  loading: false,
  error: null,
  filters: {
    search: '',
    status: null,
  },
  // 📍 ADDED: Pagination State
  nextCursor: null,
  hasMore: false,
  isFetchingNextPage: false,
};

export const fetchComplaints = createAsyncThunk(
  'complaints/fetchAll',
  // 📍 CHANGED: Accept an object so we can pass user, cursor, and filters
  async ({ user, cursor = null, issue_id = null, solver_id = null } = {}, { rejectWithValue }) => {
    try {
      // 📍 Pass filters to your API
      const result = await fetchComplaintsApi({ cursor, issue_id, solver_id });
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.complaints; // This now contains { items, next_cursor, has_more }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch complaints');
    }
  }
);

// ✅ ADD this thunk
export const fetchComplaintById = createAsyncThunk(
  'complaints/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const result = await fetchComplaintByIdApi(id);
      if (!result.success) return rejectWithValue(result.error);
      return result.complaint; // ✅ Extract the complaint object
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch complaint');
    }
  }
);

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    // ✅ ADD this action
    clearCurrentComplaint: (state) => {
      state.currentComplaint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAll
      .addCase(fetchComplaints.pending, (state, action) => {
        // 📍 CHANGED: Distinguish between initial load and infinite scroll load
        if (action.meta.arg?.cursor) {
          state.isFetchingNextPage = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.isFetchingNextPage = false;
        
        // 📍 CHANGED: Safely extract array from the new backend payload
        const payloadData = action.payload || {};
        const newItems = payloadData.items || [];

        if (action.meta.arg?.cursor) {
          // Append for infinite scroll
          state.complaints = [...state.complaints, ...newItems];
        } else {
          // Replace for initial load / pull-to-refresh
          state.complaints = newItems;
        }

        // Store cursors
        state.nextCursor = payloadData.next_cursor || null;
        state.hasMore = payloadData.has_more ?? false;
        state.error = null;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading = false;
        state.isFetchingNextPage = false;
        state.error = action.payload;
      })
      // ✅ ADD fetchById cases
      .addCase(fetchComplaintById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaintById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentComplaint = action.payload;
        state.error = null;
      })
      .addCase(fetchComplaintById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, clearFilters, clearCurrentComplaint } = complaintsSlice.actions;

const EMPTY_ARRAY = [];

// Selectors
export const selectAllComplaints = (state) => state.complaints?.complaints || EMPTY_ARRAY;
export const selectCurrentComplaint = (state) => state.complaints.currentComplaint;  // ✅ ADD
export const selectComplaintsLoading = (state) => state.complaints.loading;
export const selectComplaintsError = (state) => state.complaints.error;
export const selectFilters = (state) => state.complaints.filters;

// 📍 ADDED: Pagination Selectors
export const selectIsFetchingNextPage = (state) => state.complaints.isFetchingNextPage;
export const selectHasMoreComplaints = (state) => state.complaints.hasMore;
export const selectComplaintsNextCursor = (state) => state.complaints?.nextCursor || null;


export const selectFilteredComplaints = createSelector(
  [selectAllComplaints, selectFilters],
  (complaints, filters) => {
    if (!Array.isArray(complaints)) return [];

    let filtered = complaints;

    // Filter out resolved/closed complaints by default for "Active" view
    filtered = filtered.filter((complaint) => {
      const mockStatuses = ['Pending', 'Investigating', 'Resolved', 'Closed'];
      const status = (complaint.status || mockStatuses[complaint.id % 4]).toLowerCase();
      return status !== 'resolved' && status !== 'closed';
    });

    if (filters.status) {
      const statusLower = filters.status.toLowerCase();
      filtered = filtered.filter((complaint) => {
        const mockStatuses = ['Pending', 'Investigating', 'Resolved', 'Closed'];
        const status = (complaint.status || mockStatuses[complaint.id % 4]).toLowerCase();
        return status === statusLower;
      });
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(complaint =>
        complaint.issue_title?.toLowerCase().includes(searchLower) ||
        complaint.complaint_details?.toLowerCase().includes(searchLower) ||
        complaint.id?.toString().includes(searchLower) ||
        complaint.issue_id?.toString().includes(searchLower)
      );
    }

    return filtered;
  }
);
export default complaintsSlice.reducer;