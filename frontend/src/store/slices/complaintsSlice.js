import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchComplaints as fetchComplaintsApi } from '../../services/api';

const initialState = {
  complaints: [],
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
      const result = await fetchComplaintsApi();
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.complaints;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch complaints');
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
  },
  extraReducers: (builder) => {
    builder
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
      });
  },
});

export const { setFilters, clearFilters } = complaintsSlice.actions;

// Selectors
export const selectAllComplaints = (state) => state.complaints.complaints;
export const selectComplaintsLoading = (state) => state.complaints.loading;
export const selectComplaintsError = (state) => state.complaints.error;
export const selectFilters = (state) => state.complaints.filters;

// Filtered selector
export const selectFilteredComplaints = (state) => {
  const { complaints, filters } = state.complaints;
  let filtered = [...complaints];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(complaint =>
      complaint.complaint_details?.toLowerCase().includes(searchLower) ||
      complaint.id?.toString().includes(searchLower)
    );
  }

  // Status filter
  if (filters.status) {
    filtered = filtered.filter(complaint => complaint.status === filters.status);
  }

  return filtered;
};

export default complaintsSlice.reducer;
