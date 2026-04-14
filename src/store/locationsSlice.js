import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mondayClient } from "../services/monday/client";
import {
  createLocation as svcCreateLocation,
  updateLocation as svcUpdateLocation,
  setWorkOrderRelation,
  FETCH_BOARD_DATA,
} from "../services/monday";
import { BOARD_IDS, MONDAY_COLUMNS } from "../constants/index";
import { deepClone } from "../utils/cloneUtils";
import { optimisticUpdateRelation, revertRelation } from "./workOrderSlice";

const COL = MONDAY_COLUMNS.LOCATIONS;

export const fetchLocations = createAsyncThunk(
  "locations/fetchLocations",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mondayClient.query({
        query: FETCH_BOARD_DATA,
        variables: { boardId: [BOARD_IDS.LOCATIONS] },
        fetchPolicy: "network-only",
      });
      return deepClone(data.boards[0]);
    } catch (e) {
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
          optimisticUpdateRelation({
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
          optimisticUpdateRelation({
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
      optimisticUpdateRelation({
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
        revertRelation({
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

const locationsSlice = createSlice({
  name: "locations",
  initialState: {
    board: null,
    loading: false,
    creating: false,
    saving: false,
    error: null,
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

export const { patchLocation, restoreLocation } = locationsSlice.actions;
export default locationsSlice.reducer;