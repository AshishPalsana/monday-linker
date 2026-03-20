import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mondayClient } from '../services/mondayAPI';
import { gql } from '@apollo/client';
import {
  apiCreateLocation,
  apiUpdateLocation,
  apiSetWorkOrderRelation,
  COL,
} from '../services/mondayMutations';
import { optimisticUpdateRelation, revertRelation } from './workOrderSlice';

const FETCH_QUERY = gql`
  query GetLocations {
    boards(ids: 18400965227) {
      id name
      groups { id title color }
      columns { id title type }
      items_page(limit: 200) {
        items {
          id name
          group { id title }
          column_values {
            id text value
            ... on StatusValue { label index }
            ... on DropdownValue { text }
            ... on BoardRelationValue { display_value }
          }
        }
      }
    }
  }
`;

export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mondayClient.query({ query: FETCH_QUERY, fetchPolicy: 'network-only' });
      return JSON.parse(JSON.stringify(data.boards[0]));
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (name, { dispatch, rejectWithValue }) => {
    try {
      const created = await apiCreateLocation({ name });
      if (!/^\d+$/.test(String(created.id))) {
        await dispatch(fetchLocations());
        return null;
      }
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const createLocationAndLink = createAsyncThunk(
  'locations/createAndLink',
  async ({ form, workOrderId }, { dispatch, rejectWithValue }) => {
    try {
      if (workOrderId) {
        dispatch(optimisticUpdateRelation({
          itemId: workOrderId,
          columnId: COL.WORK_ORDERS.LOCATION,
          displayText: form.name,
          linkedId: '__pending__',
        }));
      }

      const created = await apiCreateLocation(form);

      if (workOrderId && /^\d+$/.test(String(created.id))) {
        dispatch(optimisticUpdateRelation({
          itemId: workOrderId,
          columnId: COL.WORK_ORDERS.LOCATION,
          displayText: created.name,
          linkedId: created.id,
        }));
        await apiSetWorkOrderRelation(workOrderId, created.id, COL.WORK_ORDERS.LOCATION);
      }

      await dispatch(fetchLocations());
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const linkExistingLocation = createAsyncThunk(
  'locations/linkExisting',
  async ({ workOrderId, locationId, locationName, previousSnapshot }, { dispatch, rejectWithValue }) => {
    dispatch(
      optimisticUpdateRelation({
        itemId: workOrderId,
        columnId: COL.WORK_ORDERS.LOCATION,
        displayText: locationName,
        linkedId: locationId,
      }),
    );
    try {
      await apiSetWorkOrderRelation(workOrderId, locationId, COL.WORK_ORDERS.LOCATION);
    } catch (e) {
      dispatch(
        revertRelation({
          itemId: workOrderId,
          columnId: COL.WORK_ORDERS.LOCATION,
          previousValue: previousSnapshot.value,
          previousText: previousSnapshot.text,
          previousDisplay: previousSnapshot.display_value,
        }),
      );
      return rejectWithValue(e.message);
    }
  },
);

// Optimistically patches the location item in Redux state, calls API, reverts on failure
export const updateLocation = createAsyncThunk(
  'locations/update',
  async ({ locationId, form }, { dispatch, getState, rejectWithValue }) => {
    const items = getState().locations.board?.items_page?.items || [];
    const previousItem = items.find((i) => i.id === locationId);

    dispatch(locationsSlice.actions.patchLocation({ locationId, form }));

    try {
      await apiUpdateLocation(locationId, form);
    } catch (e) {
      if (previousItem) {
        dispatch(locationsSlice.actions.restoreLocation({ locationId, previousItem }));
      }
      return rejectWithValue(e.message);
    }
  },
);

const locationsSlice = createSlice({
  name: 'locations',
  initialState: { board: null, loading: false, creating: false, saving: false, error: null },
  reducers: {
    patchLocation(state, action) {
      const { locationId, form } = action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === locationId);
      if (!item) return;

      if (form.name) item.name = form.name;

      const setCol = (colId, text) => {
        const col = item.column_values.find((cv) => cv.id === colId);
        if (col) col.text = text || '';
      };

      setCol(COL.LOCATIONS.STREET_ADDRESS, form.streetAddress);
      setCol(COL.LOCATIONS.CITY, form.city);
      setCol(COL.LOCATIONS.ZIP, form.zip);
      setCol(COL.LOCATIONS.NOTES, form.notes);

      const stateCol = item.column_values.find((cv) => cv.id === COL.LOCATIONS.STATE);
      if (stateCol) { stateCol.text = form.state || ''; stateCol.label = form.state || ''; }

      const statusCol = item.column_values.find((cv) => cv.id === COL.LOCATIONS.STATUS);
      if (statusCol) { statusCol.text = form.locationStatus || ''; statusCol.label = form.locationStatus || ''; }
    },
    restoreLocation(state, action) {
      const { locationId, previousItem } = action.payload;
      if (!state.board) return;
      const idx = state.board.items_page.items.findIndex((i) => i.id === locationId);
      if (idx !== -1) state.board.items_page.items[idx] = previousItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLocations.fulfilled, (state, action) => { state.loading = false; state.board = action.payload; })
      .addCase(fetchLocations.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createLocation.fulfilled, (state, action) => {
        if (!action.payload || !state.board) return;
        if (!/^\d+$/.test(String(action.payload.id))) return;
        const newItem = {
          id: action.payload.id,
          name: action.payload.name,
          group: { id: 'topics', title: 'Active Locations' },
          column_values: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.board.items_page.items.push(newItem);
      })
      .addCase(createLocationAndLink.pending, (state) => { state.creating = true; })
      .addCase(createLocationAndLink.fulfilled, (state) => { state.creating = false; })
      .addCase(createLocationAndLink.rejected, (state) => { state.creating = false; })
      .addCase(updateLocation.pending, (state) => { state.saving = true; })
      .addCase(updateLocation.fulfilled, (state) => { state.saving = false; })
      .addCase(updateLocation.rejected, (state) => { state.saving = false; });
  },
});

export const { patchLocation, restoreLocation } = locationsSlice.actions;
export default locationsSlice.reducer;