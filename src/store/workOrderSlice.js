import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mondayClient } from '../services/mondayAPI';
import { gql } from '@apollo/client';
import { apiCreateWorkOrder, apiUpdateWorkOrder } from '../services/mondayMutations';

export const fetchWorkOrders = createAsyncThunk(
  'workOrders/fetchWorkOrders',
  async (_, { rejectWithValue }) => {
    const query = gql`
      query GetBoardData {
        boards(ids: 18402613691) {
          id
          name
          groups { id title color }
          columns { id title type }
          items_page(limit: 100) {
            items {
              id
              name
              group { id title }
              column_values {
                id
                text
                value
                ... on StatusValue { label index }
                ... on BoardRelationValue { display_value }
                ... on MirrorValue { display_value }
                ... on CheckboxValue { value }
              }
              created_at
              updated_at
            }
          }
        }
      }
    `;
    try {
      const { data } = await mondayClient.query({ query, fetchPolicy: 'network-only' });
      return JSON.parse(JSON.stringify(data.boards[0]));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const createWorkOrder = createAsyncThunk(
  'workOrders/createWorkOrder',
  async (form, { dispatch, rejectWithValue }) => {
    try {
      const created = await apiCreateWorkOrder(form);
      // Wait for refetch so the board is always up to date
      await dispatch(fetchWorkOrders());
      return created;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateWorkOrder = createAsyncThunk(
  'workOrders/updateWorkOrder',
  async ({ workOrderId, form }, { dispatch, rejectWithValue }) => {
    try {
      await apiUpdateWorkOrder(workOrderId, form);
      await dispatch(fetchWorkOrders());
      return { workOrderId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const workOrderSlice = createSlice({
  name: 'workOrders',
  initialState: {
    board: null,
    loading: false,
    creating: false,
    saving: false,
    error: null,
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
      // Store linkedPulseIds so getColumnValue resolver also works
      col.value = JSON.stringify({
        item_ids: [String(linkedId)],
      });
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

export const { optimisticUpdateRelation, revertRelation } = workOrderSlice.actions;
export default workOrderSlice.reducer;