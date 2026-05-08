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

      // Defensive: guarantee we always return an array
      const sites = res.sites;
      return Array.isArray(sites) ? sites : [];
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
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSitesWithAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load sites';
      });
  },
});

export default sitesSlice.reducer;
export const selectSitesState = state => state.sites || { items: [], loading: false };
export const selectAllSites = createSelector(selectSitesState, s => Array.isArray(s?.items) ? s.items : []);
export const selectSitesLoading = createSelector(selectSitesState, s => s?.loading || false);
export const selectSiteById = (state, id) => {
  const items = state.sites?.items;
  return Array.isArray(items) ? items.find(s => s.id === id) || null : null;
};