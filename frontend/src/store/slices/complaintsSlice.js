import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchComplaints as fetchComplaintsApi,
  fetchComplaintById as fetchComplaintByIdApi,
} from '../../mocks/apiService';

const initialState = {
  complaints: [],
  currentComplaint: null,        // ✅ ADD
  loading: false,
  error: null,
  filters: {
    search: '',
    status: null,
  },
};

export const fetchComplaints = createAsyncThunk(
  'complaints/fetchAll',
  async (user, { rejectWithValue }) => {
    try {
      const result = await fetchComplaintsApi(user);    // ✅ pass user
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.complaints;
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
      return result;
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
      .addCase(fetchComplaints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.complaints = action.payload;
        state.error = null;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading = false;
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

// Selectors
export const selectAllComplaints = (state) => state.complaints.complaints;
export const selectCurrentComplaint = (state) => state.complaints.currentComplaint;  // ✅ ADD
export const selectComplaintsLoading = (state) => state.complaints.loading;
export const selectComplaintsError = (state) => state.complaints.error;
export const selectFilters = (state) => state.complaints.filters;
export const selectFilteredComplaints = (state) => {
  const { complaints, filters } = state.complaints;
  let filtered = [...complaints];
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(complaint =>
      complaint.complaint_details?.toLowerCase().includes(searchLower) ||
      complaint.id?.toString().includes(searchLower)
    );
  }
  if (filters.status) {
    filtered = filtered.filter(complaint => complaint.status === filters.status);
  }
  return filtered;
};

export default complaintsSlice.reducer;