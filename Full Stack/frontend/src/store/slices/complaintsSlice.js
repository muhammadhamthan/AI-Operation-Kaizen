import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchComplaints as fetchComplaintsApi, fetchComplaintById as fetchComplaintByIdApi } from '../../mocks/apiService';

const initialState = {
  complaints: [],
  currentComplaint: null,
  loading: false,
  error: null,
  filters: {
    status: null,
    search: '',
  },
};

export const fetchComplaints = createAsyncThunk(
  'complaints/fetchAll',
  async (user, { rejectWithValue }) => {
    try {
      const complaints = await fetchComplaintsApi(user);
      return complaints;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchComplaintById = createAsyncThunk(
  'complaints/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const complaint = await fetchComplaintByIdApi(id);
      return complaint;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    setComplaints: (state, action) => {
      state.complaints = action.payload;
    },
    setCurrentComplaint: (state, action) => {
      state.currentComplaint = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentComplaint: (state) => {
      state.currentComplaint = null;
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
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchComplaintById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaintById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentComplaint = action.payload;
      })
      .addCase(fetchComplaintById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setComplaints, setCurrentComplaint, setFilters, clearFilters, clearCurrentComplaint } = complaintsSlice.actions;

// Selectors
export const selectAllComplaints = (state) => state.complaints.complaints;
export const selectCurrentComplaint = (state) => state.complaints.currentComplaint;
export const selectComplaintsLoading = (state) => state.complaints.loading;
export const selectComplaintsError = (state) => state.complaints.error;

export const selectFilteredComplaints = (state) => {
  const { complaints, filters } = state.complaints;
  let filtered = [...complaints];
  
  if (filters.status) {
    filtered = filtered.filter(c => c.status === filters.status);
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(c => 
      c.complaint_details.toLowerCase().includes(search) ||
      c.id.toString().includes(search)
    );
  }
  
  return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export default complaintsSlice.reducer;
