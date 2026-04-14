import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mondayClient } from "../services/monday/client";
import {
  createEquipment as svcCreateEquipment,
  updateEquipment as svcUpdateEquipment,
  setEquipmentLocation,
  createLocation,
  FETCH_BOARD_DATA,
} from "../services/monday";
import { BOARD_IDS, MONDAY_COLUMNS } from "../constants/index";
import { deepClone } from "../utils/cloneUtils";

const COL = MONDAY_COLUMNS.EQUIPMENT;

export const fetchEquipment = createAsyncThunk(
  "equipment/fetchEquipment",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mondayClient.query({
        query: FETCH_BOARD_DATA,
        variables: { boardId: [BOARD_IDS.EQUIPMENT] },
        fetchPolicy: "network-only",
      });
      return deepClone(data.boards[0]);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createEquipment = createAsyncThunk(
  "equipment/createEquipment",
  async (form, { dispatch, rejectWithValue }) => {
    try {
      const created = await svcCreateEquipment(form);
      await dispatch(fetchEquipment());
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const linkExistingLocation = createAsyncThunk(
  "equipment/linkExistingLocation",
  async (
    { equipmentId, locationId, locationName, previousSnapshot },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(
      equipmentSlice.actions.patchLocationRelation({
        equipmentId,
        displayText: locationName,
        linkedId: locationId,
      }),
    );
    try {
      await setEquipmentLocation(equipmentId, locationId);
    } catch (e) {
      dispatch(
        equipmentSlice.actions.patchLocationRelation({
          equipmentId,
          displayText:
            previousSnapshot.display_value || previousSnapshot.text || "",
          linkedId: null,
          value: previousSnapshot.value,
        }),
      );
      return rejectWithValue(e.message);
    }
  },
);

export const createLocationAndLink = createAsyncThunk(
  "equipment/createLocationAndLink",
  async ({ form, equipmentId }, { dispatch, rejectWithValue }) => {
    try {
      if (equipmentId) {
        dispatch(
          equipmentSlice.actions.patchLocationRelation({
            equipmentId,
            displayText: form.name,
            linkedId: "__pending__",
          }),
        );
      }

      const created = await createLocation(form);

      if (equipmentId && /^\d+$/.test(String(created.id))) {
        dispatch(
          equipmentSlice.actions.patchLocationRelation({
            equipmentId,
            displayText: created.name,
            linkedId: created.id,
          }),
        );
        await setEquipmentLocation(equipmentId, created.id);
      }

      await dispatch(fetchEquipment());
      // Refresh locations slice if available
      const { fetchLocations } = await import("./locationsSlice");
      await dispatch(fetchLocations());

      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const updateEquipment = createAsyncThunk(
  "equipment/update",
  async ({ equipmentId, form }, { dispatch, getState, rejectWithValue }) => {
    const items = getState().equipment.board?.items_page?.items || [];
    const previousItem = items.find((i) => i.id === equipmentId);

    dispatch(equipmentSlice.actions.patchEquipment({ equipmentId, form }));

    try {
      await svcUpdateEquipment(equipmentId, form);
    } catch (e) {
      if (previousItem) {
        dispatch(
          equipmentSlice.actions.restoreEquipment({
            equipmentId,
            previousItem,
          }),
        );
      }
      return rejectWithValue(e.message);
    }
  },
);

const equipmentSlice = createSlice({
  name: "equipment",
  initialState: {
    board: null,
    loading: false,
    creating: false,
    saving: false,
    error: null,
  },
  reducers: {
    patchLocationRelation(state, action) {
      const { equipmentId, displayText, linkedId, value } = action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === equipmentId);
      if (!item) return;
      const col = item.column_values.find((cv) => cv.id === COL.LOCATION);
      if (!col) return;
      col.display_value = displayText;
      col.text = displayText;
      col.value =
        value ??
        (linkedId && linkedId !== "__pending__"
          ? JSON.stringify({ item_ids: [String(linkedId)] })
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
        if (col) col.text = text || "";
      };

      setCol(COL.MANUFACTURER, form.manufacturer);
      setCol(COL.MODEL_NUMBER, form.modelNumber);
      setCol(COL.SERIAL_NUMBER, form.serialNumber);
      setCol(COL.INSTALL_DATE, form.installDate);
      setCol(COL.NOTES, form.notes);

      if (form.locationId && form.locationName) {
        const locCol = item.column_values.find((cv) => cv.id === COL.LOCATION);
        if (locCol) {
          locCol.text = form.locationName;
          locCol.display_value = form.locationName;
          locCol.value = JSON.stringify({ item_ids: [String(form.locationId)] });
        }
      }

      const statusCol = item.column_values.find((cv) => cv.id === COL.STATUS);
      if (statusCol) {
        statusCol.label = form.status || "";
        statusCol.text = form.status || "";
      }
    },

    restoreEquipment(state, action) {
      const { equipmentId, previousItem } = action.payload;
      if (!state.board) return;
      const idx = state.board.items_page.items.findIndex(
        (i) => i.id === equipmentId,
      );
      if (idx !== -1) state.board.items_page.items[idx] = previousItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEquipment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEquipment.fulfilled, (state, action) => {
        state.loading = false;
        state.board = action.payload;
      })
      .addCase(fetchEquipment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createEquipment.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createEquipment.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createEquipment.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload;
      })
      .addCase(createLocationAndLink.pending, (state) => {
        state.creating = true;
      })
      .addCase(createLocationAndLink.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createLocationAndLink.rejected, (state) => {
        state.creating = false;
      })
      .addCase(updateEquipment.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateEquipment.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(updateEquipment.rejected, (state) => {
        state.saving = false;
      });
  },
});

export const { patchLocationRelation, patchEquipment, restoreEquipment } =
  equipmentSlice.actions;
export default equipmentSlice.reducer;