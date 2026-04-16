import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mondayClient } from "../services/monday/client";
import {
  createWorkOrder as svcCreateWorkOrder,
  updateWorkOrder as svcUpdateWorkOrder,
  FETCH_BOARD_DATA,
} from "../services/monday";
import { BOARD_IDS } from "../constants/index";
import { deepClone } from "../utils/cloneUtils";
import { parseBoardStatusColors } from "../utils/mondayUtils";

export const fetchWorkOrders = createAsyncThunk(
  "workOrders/fetchWorkOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await mondayClient.query({
        query: FETCH_BOARD_DATA,
        variables: { boardId: [BOARD_IDS.WORK_ORDERS] },
        fetchPolicy: "network-only",
      });

      if (response.errors) {
        console.error("[fetchWorkOrders] GraphQL Errors:", response.errors);
        return rejectWithValue(response.errors[0].message);
      }

      if (
        !response.data ||
        !response.data.boards ||
        response.data.boards.length === 0
      ) {
        console.error("[fetchWorkOrders] No board data returned:", response);
        return rejectWithValue("No board data found for Work Orders.");
      }

      return deepClone(response.data.boards[0]);
    } catch (error) {
      console.error("[fetchWorkOrders] Catch Error:", error);
      return rejectWithValue(error.message);
    }
  },
);

export const createWorkOrder = createAsyncThunk(
  "workOrders/createWorkOrder",
  async (form, { dispatch, rejectWithValue }) => {
    try {
      const created = await svcCreateWorkOrder(form);
      // Wait for refetch so the board is always up to date
      await dispatch(fetchWorkOrders());
      return created;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const updateWorkOrder = createAsyncThunk(
  "workOrders/updateWorkOrder",
  async ({ workOrderId, form }, { dispatch, rejectWithValue }) => {
    try {
      await svcUpdateWorkOrder(workOrderId, form);
      await dispatch(fetchWorkOrders());
      return { workOrderId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const workOrderSlice = createSlice({
  name: "workOrders",
  initialState: {
    board: null,
    loading: false,
    creating: false,
    saving: false,
    error: null,
    statusColors: {},
  },
  reducers: {
    // Optimistically update a board_relation column's display text on a single item
    optimisticUpdateRelation(state, action) {
      const { itemId, columnId, displayText, linkedId } = action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === itemId);
      if (!item) return;
      const col = item.column_values.find((cv) => cv.id === columnId);
      if (!col) return;
      col.display_value = displayText;
      col.text = displayText;
      // Store linked ids so getColumnValue resolver also works
      col.value = JSON.stringify({ item_ids: [Number(linkedId)] });
    },
    // Revert a single item's column back to previous values on API failure
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.board = action.payload;
        state.statusColors = parseBoardStatusColors(action.payload);
      })
      .addCase(fetchWorkOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createWorkOrder.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createWorkOrder.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createWorkOrder.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload;
      })
      .addCase(updateWorkOrder.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateWorkOrder.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(updateWorkOrder.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const { optimisticUpdateRelation, revertRelation } =
  workOrderSlice.actions;
export default workOrderSlice.reducer;
