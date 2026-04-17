import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mondayClient } from "../services/monday/client";
import {
  createLocation as svcCreateLocation,
  updateLocation as svcUpdateLocation,
  setWorkOrderRelation,
  setRelationColumn,
  FETCH_BOARD_DATA,
} from "../services/monday";
import { BOARD_IDS, MONDAY_COLUMNS } from "../constants/index";
import { deepClone } from "../utils/cloneUtils";
import { parseBoardStatusColors } from "../utils/mondayUtils";
import { optimisticUpdateRelation as optimisticWoRelation, revertRelation as revertWoRelation } from "./workOrderSlice";

const COL = MONDAY_COLUMNS.LOCATIONS;

export const fetchLocations = createAsyncThunk(
  "locations/fetchLocations",
  async (_, { rejectWithValue }) => {
    try {
      const resp = await mondayClient.query({
        query: FETCH_BOARD_DATA,
        variables: { boardId: [BOARD_IDS.LOCATIONS] },
        fetchPolicy: "network-only",
      });
      if (resp.errors) throw new Error(resp.errors[0].message);
      if (!resp.data?.boards?.[0]) throw new Error("Locations board not found.");
      return deepClone(resp.data.boards[0]);
    } catch (e) {
      console.error("[fetchLocations] Error:", e);
      return rejectWithValue(e.message);
    }
  },
);

export const createLocation = createAsyncThunk(
  "locations/createLocation",
  async (form, { dispatch, rejectWithValue }) => {
    try {
      const created = await svcCreateLocation(form);
      await dispatch(fetchLocations());
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createLocationAndLink = createAsyncThunk(
  "locations/createAndLink",
  async ({ form, workOrderId }, { dispatch, rejectWithValue }) => {
    try {
      if (workOrderId) {
        dispatch(
          optimisticWoRelation({
            itemId: workOrderId,
            columnId: MONDAY_COLUMNS.WORK_ORDERS.LOCATION,
            displayText: form.name,
            linkedId: "__pending__",
          }),
        );
      }

      const created = await svcCreateLocation(form);

      if (workOrderId && /^\d+$/.test(String(created.id))) {
        dispatch(
          optimisticWoRelation({
            itemId: workOrderId,
            columnId: MONDAY_COLUMNS.WORK_ORDERS.LOCATION,
            displayText: created.name,
            linkedId: created.id,
          }),
        );
        await setWorkOrderRelation(
          workOrderId,
          created.id,
          MONDAY_COLUMNS.WORK_ORDERS.LOCATION,
        );
      }

      await dispatch(fetchLocations());
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const linkExistingLocation = createAsyncThunk(
  "locations/linkExisting",
  async (
    { workOrderId, locationId, locationName, previousSnapshot },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(
      optimisticWoRelation({
        itemId: workOrderId,
        columnId: MONDAY_COLUMNS.WORK_ORDERS.LOCATION,
        displayText: locationName,
        linkedId: locationId,
      }),
    );
    try {
      await setWorkOrderRelation(
        workOrderId,
        locationId,
        MONDAY_COLUMNS.WORK_ORDERS.LOCATION,
      );
    } catch (e) {
      dispatch(
        revertWoRelation({
          itemId: workOrderId,
          columnId: MONDAY_COLUMNS.WORK_ORDERS.LOCATION,
          previousValue: previousSnapshot.value,
          previousText: previousSnapshot.text,
          previousDisplay: previousSnapshot.display_value,
        }),
      );
      return rejectWithValue(e.message);
    }
  },
);

export const updateLocation = createAsyncThunk(
  "locations/update",
  async ({ locationId, form }, { dispatch, getState, rejectWithValue }) => {
    const items = getState().locations.board?.items_page?.items || [];
    const previousItem = items.find((i) => i.id === locationId);

    dispatch(locationsSlice.actions.patchLocation({ locationId, form }));

    try {
      await svcUpdateLocation(locationId, form);
    } catch (e) {
      if (previousItem) {
        dispatch(
          locationsSlice.actions.restoreLocation({ locationId, previousItem }),
        );
      }
      return rejectWithValue(e.message);
    }
  },
);

/**
 * Generic thunk to link any record (Customer, Equipment, etc) to a Location.
 * Stored in the Location item's relation column.
 */
export const linkRecordToLocation = createAsyncThunk(
  "locations/linkRecord",
  async (
    { locationId, columnId, linkedId, linkedName, previousSnapshot },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(
      locationsSlice.actions.optimisticUpdateRelation({
        itemId: locationId,
        columnId,
        displayText: linkedName,
        linkedId,
      }),
    );
    try {
      await setRelationColumn(
        BOARD_IDS.LOCATIONS,
        locationId,
        columnId,
        linkedId,
      );
    } catch (e) {
      dispatch(
        locationsSlice.actions.revertRelation({
          itemId: locationId,
          columnId,
          previousValue: previousSnapshot.value,
          previousText: previousSnapshot.text,
          previousDisplay: previousSnapshot.display_value,
        }),
      );
      return rejectWithValue(e.message);
    }
  },
);

const locationsSlice = createSlice({
  name: "locations",
  initialState: {
    board: null,
    loading: false,
    creating: false,
    saving: false,
    error: null,
    statusColors: {},
  },
  reducers: {
    patchLocation(state, action) {
      const { locationId, form } = action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === locationId);
      if (!item) return;

      if (form.name) item.name = form.name;

      const setCol = (colId, text) => {
        const col = item.column_values.find((cv) => cv.id === colId);
        if (col) col.text = text || "";
      };

      setCol(COL.STREET_ADDRESS, form.streetAddress);
      setCol(COL.CITY, form.city);
      setCol(COL.ZIP, form.zip);
      setCol(COL.NOTES, form.notes);

      const stateCol = item.column_values.find((cv) => cv.id === COL.STATE);
      if (stateCol) {
        stateCol.text = form.state || "";
        stateCol.label = form.state || "";
      }

      const statusCol = item.column_values.find((cv) => cv.id === COL.STATUS);
      if (statusCol) {
        statusCol.text = form.locationStatus || "";
        statusCol.label = form.locationStatus || "";
      }
    },
    optimisticUpdateRelation(state, action) {
      const { itemId, columnId, displayText, linkedId } = action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === itemId);
      if (!item) return;
      const col = item.column_values.find((cv) => cv.id === columnId);
      if (!col) return;
      col.display_value = displayText;
      col.text = displayText;
      col.value = JSON.stringify({ item_ids: [Number(linkedId)] });
    },
    revertRelation(state, action) {
      const { itemId, columnId, previousValue, previousText, previousDisplay } =
        action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === itemId);
      if (!item) return;
      const col = item.column_values.find((cv) => cv.id === columnId);
      if (!col) return;
      col.value = previousValue;
      col.text = previousText;
      col.display_value = previousDisplay;
    },
    restoreLocation(state, action) {
      const { locationId, previousItem } = action.payload;
      if (!state.board) return;
      const idx = state.board.items_page.items.findIndex(
        (i) => i.id === locationId,
      );
      if (idx !== -1) state.board.items_page.items[idx] = previousItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.board = action.payload;
        state.statusColors = parseBoardStatusColors(action.payload);
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createLocation.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createLocation.rejected, (state, action) => {
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
      .addCase(updateLocation.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateLocation.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(updateLocation.rejected, (state) => {
        state.saving = false;
      });
  },
});

export const { patchLocation, restoreLocation, optimisticUpdateRelation, revertRelation } = locationsSlice.actions;
export default locationsSlice.reducer;