import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mondayClient } from '../services/mondayAPI';
import { gql } from '@apollo/client';
import {
  apiCreateEquipment,
  apiUpdateEquipment,
  apiSetEquipmentLocation,
  COL,
} from '../services/mondayMutations';

const FETCH_QUERY = gql`
  query GetEquipment {
    boards(ids: 18403226725) {
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
          created_at updated_at
        }
      }
    }
  }
`;

export const fetchEquipment = createAsyncThunk(
  'equipment/fetchEquipment',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mondayClient.query({ query: FETCH_QUERY, fetchPolicy: 'network-only' });
      return JSON.parse(JSON.stringify(data.boards[0]));
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createEquipment = createAsyncThunk(
  'equipment/createEquipment',
  async (name, { dispatch, rejectWithValue }) => {
    try {
      const created = await apiCreateEquipment({ name });
      // If Monday returns a temp "c{timestamp}" ID, refetch to get the real numeric ID
      if (!/^\d+$/.test(String(created.id))) {
        await dispatch(fetchEquipment());
        return null;
      }
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

// Link an existing location to an equipment item — optimistic update + API call
export const linkExistingLocation = createAsyncThunk(
  'equipment/linkExistingLocation',
  async ({ equipmentId, locationId, locationName, previousSnapshot }, { dispatch, rejectWithValue }) => {
    // Optimistic: show name instantly
    dispatch(equipmentSlice.actions.patchLocationRelation({
      equipmentId,
      displayText: locationName,
      linkedId: locationId,
    }));
    try {
      await apiSetEquipmentLocation(equipmentId, locationId);
    } catch (e) {
      // Revert on failure
      dispatch(equipmentSlice.actions.patchLocationRelation({
        equipmentId,
        displayText: previousSnapshot.display_value || previousSnapshot.text || '',
        linkedId: null,
        value: previousSnapshot.value,
      }));
      return rejectWithValue(e.message);
    }
  },
);

// Create a brand-new location and immediately link it to the equipment item
export const createLocationAndLink = createAsyncThunk(
  'equipment/createLocationAndLink',
  async ({ form, equipmentId }, { dispatch, rejectWithValue }) => {
    try {
      // Optimistic: show name right away with a pending marker
      if (equipmentId) {
        dispatch(equipmentSlice.actions.patchLocationRelation({
          equipmentId,
          displayText: form.name,
          linkedId: '__pending__',
        }));
      }

      // Import here to avoid circular deps — use the locations API directly
      const { apiCreateLocation } = await import('../services/mondayMutations');
      const created = await apiCreateLocation(form);

      if (equipmentId && /^\d+$/.test(String(created.id))) {
        dispatch(equipmentSlice.actions.patchLocationRelation({
          equipmentId,
          displayText: created.name,
          linkedId: created.id,
        }));
        await apiSetEquipmentLocation(equipmentId, created.id);
      }

      // Refresh both equipment and locations so both boards stay in sync
      await dispatch(fetchEquipment());
      const { fetchLocations } = await import('./locationsSlice');
      await dispatch(fetchLocations());

      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

// Optimistically update equipment fields, call API, revert on failure
export const updateEquipment = createAsyncThunk(
  'equipment/update',
  async ({ equipmentId, form }, { dispatch, getState, rejectWithValue }) => {
    const items = getState().equipment.board?.items_page?.items || [];
    const previousItem = items.find((i) => i.id === equipmentId);

    dispatch(equipmentSlice.actions.patchEquipment({ equipmentId, form }));

    try {
      await apiUpdateEquipment(equipmentId, form);
    } catch (e) {
      if (previousItem) {
        dispatch(equipmentSlice.actions.restoreEquipment({ equipmentId, previousItem }));
      }
      return rejectWithValue(e.message);
    }
  },
);

const equipmentSlice = createSlice({
  name: 'equipment',
  initialState: { board: null, loading: false, creating: false, saving: false, error: null },
  reducers: {
    // Immediately update the location relation column in Redux state
    patchLocationRelation(state, action) {
      const { equipmentId, displayText, linkedId, value } = action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === equipmentId);
      if (!item) return;
      const col = item.column_values.find((cv) => cv.id === COL.EQUIPMENT.LOCATION);
      if (!col) return;
      col.display_value = displayText;
      col.text = displayText;
      col.value = value ?? (linkedId && linkedId !== '__pending__'
        ? JSON.stringify({ linkedPulseIds: [{ linkedPulseId: parseInt(linkedId) }] })
        : col.value);
    },

    patchEquipment(state, action) {
      const { equipmentId, form } = action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === equipmentId);
      if (!item) return;

      if (form.name) item.name = form.name;

      const setCol = (colId, text) => {
        const col = item.column_values.find((cv) => cv.id === colId);
        if (col) col.text = text || '';
      };

      setCol(COL.EQUIPMENT.MANUFACTURER, form.manufacturer);
      setCol(COL.EQUIPMENT.MODEL_NUMBER,  form.modelNumber);
      setCol(COL.EQUIPMENT.SERIAL_NUMBER, form.serialNumber);
      setCol(COL.EQUIPMENT.INSTALL_DATE,  form.installDate);
      setCol(COL.EQUIPMENT.NOTES,         form.notes);

      const statusCol = item.column_values.find((cv) => cv.id === COL.EQUIPMENT.STATUS);
      if (statusCol) { statusCol.label = form.status || ''; statusCol.text = form.status || ''; }
    },

    restoreEquipment(state, action) {
      const { equipmentId, previousItem } = action.payload;
      if (!state.board) return;
      const idx = state.board.items_page.items.findIndex((i) => i.id === equipmentId);
      if (idx !== -1) state.board.items_page.items[idx] = previousItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEquipment.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchEquipment.fulfilled, (state, action) => { state.loading = false; state.board = action.payload; })
      .addCase(fetchEquipment.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createEquipment.fulfilled, (state, action) => {
        if (!action.payload || !state.board) return;
        if (!/^\d+$/.test(String(action.payload.id))) return;
        state.board.items_page.items.push({
          id: action.payload.id,
          name: action.payload.name,
          group: { id: 'topics', title: 'Active Equipment' },
          column_values: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      })
      .addCase(createLocationAndLink.pending,   (state) => { state.creating = true; })
      .addCase(createLocationAndLink.fulfilled,  (state) => { state.creating = false; })
      .addCase(createLocationAndLink.rejected,   (state) => { state.creating = false; })
      .addCase(updateEquipment.pending,   (state) => { state.saving = true; })
      .addCase(updateEquipment.fulfilled, (state) => { state.saving = false; })
      .addCase(updateEquipment.rejected,  (state) => { state.saving = false; });
  },
});

export const { patchLocationRelation, patchEquipment, restoreEquipment } = equipmentSlice.actions;
export default equipmentSlice.reducer;