import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { fetchSitesAnalytics } from '../../services/api';

export const fetchSitesWithAnalytics = createAsyncThunk(
  'sites/fetchWithAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchSitesAnalytics();

      if (!res.success) {
        return rejectWithValue(res.error);
      }

      // Return the array of sites directly from the backend
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
        state.items = action.payload || [];
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