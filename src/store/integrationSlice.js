import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { integrationApi } from '../services/integrationApi';

export const fetchXeroStatus = createAsyncThunk(
  'integration/fetchXeroStatus',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.data?.token;
      return await integrationApi.getXeroStatus(token);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchCompanyCamStatus = createAsyncThunk(
  'integration/fetchCompanyCamStatus',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.data?.token;
      return await integrationApi.getCompanyCamStatus(token);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

const integrationSlice = createSlice({
  name: 'integration',
  initialState: {
    xero: {
      connected: false,
      tenantName: null,
      loading: false,
      error: null,
    },
    companyCam: {
      connected: false,
      loading: false,
      error: null,
    },
  },
  reducers: {
    setXeroStatus: (state, action) => {
      state.xero.connected = action.payload.connected;
      state.xero.tenantName = action.payload.tenantName;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchXeroStatus.pending, (state) => {
        state.xero.loading = true;
        state.xero.error = null;
      })
      .addCase(fetchXeroStatus.fulfilled, (state, action) => {
        state.xero.loading = false;
        state.xero.connected = action.payload.connected;
        state.xero.tenantName = action.payload.tenantName;
      })
      .addCase(fetchXeroStatus.rejected, (state, action) => {
        state.xero.loading = false;
        state.xero.error = action.payload;
      })
      .addCase(fetchCompanyCamStatus.pending, (state) => {
        state.companyCam.loading = true;
        state.companyCam.error = null;
      })
      .addCase(fetchCompanyCamStatus.fulfilled, (state, action) => {
        state.companyCam.loading = false;
        state.companyCam.connected = action.payload.connected;
      })
      .addCase(fetchCompanyCamStatus.rejected, (state, action) => {
        state.companyCam.loading = false;
        state.companyCam.error = action.payload;
      });
  },
});

export const { setXeroStatus } = integrationSlice.actions;
export default integrationSlice.reducer;

