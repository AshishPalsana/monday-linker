import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mondayClient } from '../services/mondayAPI';
import { gql } from '@apollo/client';
import {
  apiCreateCustomer,
  apiUpdateCustomer,
  apiSetWorkOrderRelation,
  COL,
} from '../services/mondayMutations';
import { optimisticUpdateRelation, revertRelation } from './workOrderSlice';

const FETCH_QUERY = gql`
  query GetCustomers {
    boards(ids: 18400951947) {
      id name
      groups { id title }
      columns { id title type }
      items_page(limit: 100) {
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

export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mondayClient.query({ query: FETCH_QUERY, fetchPolicy: 'network-only' });
      return JSON.parse(JSON.stringify(data.boards[0]));
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (name, { dispatch, rejectWithValue }) => {
    try {
      const created = await apiCreateCustomer({ name });
      // Monday sometimes returns a temp "c{timestamp}" ID before the item is committed.
      // If that happens, refetch immediately so the board shows the real numeric ID.
      if (!/^\d+$/.test(String(created.id))) {
        await dispatch(fetchCustomers());
        return null; // fetchCustomers already updated state — skip the push below
      }
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const createCustomerAndLink = createAsyncThunk(
  'customers/createAndLink',
  async ({ form, workOrderId }, { dispatch, rejectWithValue }) => {
    try {
      // Show name immediately in the work order row before any API call
      if (workOrderId) {
        dispatch(optimisticUpdateRelation({
          itemId: workOrderId,
          columnId: COL.WORK_ORDERS.CUSTOMER,
          displayText: form.name,
          linkedId: '__pending__',
        }));
      }

      const created = await apiCreateCustomer(form);

      // Update with real ID (only if Monday returned a valid numeric ID)
      if (workOrderId && /^\d+$/.test(String(created.id))) {
        dispatch(optimisticUpdateRelation({
          itemId: workOrderId,
          columnId: COL.WORK_ORDERS.CUSTOMER,
          displayText: created.name,
          linkedId: created.id,
        }));
        await apiSetWorkOrderRelation(workOrderId, created.id, COL.WORK_ORDERS.CUSTOMER);
      }

      // Refetch always — this also resolves any temp ID to the real Monday numeric ID
      await dispatch(fetchCustomers());
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const linkExistingCustomer = createAsyncThunk(
  'customers/linkExisting',
  async ({ workOrderId, customerId, customerName, previousSnapshot }, { dispatch, rejectWithValue }) => {
    dispatch(
      optimisticUpdateRelation({
        itemId: workOrderId,
        columnId: COL.WORK_ORDERS.CUSTOMER,
        displayText: customerName,
        linkedId: customerId,
      }),
    );
    try {
      await apiSetWorkOrderRelation(workOrderId, customerId, COL.WORK_ORDERS.CUSTOMER);
    } catch (e) {
      dispatch(
        revertRelation({
          itemId: workOrderId,
          columnId: COL.WORK_ORDERS.CUSTOMER,
          previousValue: previousSnapshot.value,
          previousText: previousSnapshot.text,
          previousDisplay: previousSnapshot.display_value,
        }),
      );
      return rejectWithValue(e.message);
    }
  },
);

// Optimistically patches the item in Redux state, calls the API, reverts on failure
export const updateCustomer = createAsyncThunk(
  'customers/update',
  async ({ customerId, form }, { dispatch, getState, rejectWithValue }) => {
    // Snapshot current item for revert
    const items = getState().customers.board?.items_page?.items || [];
    const previousItem = items.find((i) => i.id === customerId);

    // Optimistic patch — update Redux immediately so UI reflects change
    dispatch(customersSlice.actions.patchCustomer({ customerId, form }));

    try {
      await apiUpdateCustomer(customerId, form);
    } catch (e) {
      // Revert to previous item data on API failure
      if (previousItem) {
        dispatch(customersSlice.actions.restoreCustomer({ customerId, previousItem }));
      }
      return rejectWithValue(e.message);
    }
  },
);

const customersSlice = createSlice({
  name: 'customers',
  initialState: { board: null, loading: false, creating: false, saving: false, error: null },
  reducers: {
    // Immediately patch a customer's fields in Redux state
    patchCustomer(state, action) {
      const { customerId, form } = action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === customerId);
      if (!item) return;

      // Update item name
      if (form.name) item.name = form.name;

      // Helper to set a column's text value
      const setCol = (colId, text) => {
        const col = item.column_values.find((cv) => cv.id === colId);
        if (col) col.text = text || '';
      };

      setCol(COL.CUSTOMERS.EMAIL, form.email);
      setCol(COL.CUSTOMERS.PHONE, form.phone);
      setCol(COL.CUSTOMERS.ACCOUNT_NUMBER, form.accountNumber);
      setCol(COL.CUSTOMERS.BILLING_ADDRESS, form.billingAddress);
      setCol(COL.CUSTOMERS.BILLING_TERMS, form.billingTerms);
      setCol(COL.CUSTOMERS.XERO_CONTACT_ID, form.xeroContactId);
      setCol(COL.CUSTOMERS.NOTES, form.notes);

      // Xero Sync Status uses label field (it's a status/color column)
      const xeroSyncCol = item.column_values.find((cv) => cv.id === COL.CUSTOMERS.XERO_SYNC_STATUS);
      if (xeroSyncCol) {
        xeroSyncCol.label = form.xeroSyncStatus || '';
        xeroSyncCol.text = form.xeroSyncStatus || '';
      }

      // Status uses label field
      const statusCol = item.column_values.find((cv) => cv.id === COL.CUSTOMERS.STATUS);
      if (statusCol) {
        statusCol.label = form.status || '';
        statusCol.text = form.status || '';
      }
    },
    // Restore a customer to its previous state (used on API failure)
    restoreCustomer(state, action) {
      const { customerId, previousItem } = action.payload;
      if (!state.board) return;
      const idx = state.board.items_page.items.findIndex((i) => i.id === customerId);
      if (idx !== -1) {
        state.board.items_page.items[idx] = previousItem;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCustomers.fulfilled, (state, action) => { state.loading = false; state.board = action.payload; })
      .addCase(fetchCustomers.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createCustomer.fulfilled, (state, action) => {
        // null payload means a temp ID was returned and fetchCustomers() already refreshed state
        if (!action.payload || !state.board) return;
        // Extra guard: never store a non-numeric (temp) ID in state
        if (!/^\d+$/.test(String(action.payload.id))) return;
        const newItem = {
          id: action.payload.id,
          name: action.payload.name,
          group: { id: 'topics', title: 'Active Customers' },
          column_values: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.board.items_page.items.push(newItem);
      })
      .addCase(createCustomerAndLink.pending, (state) => { state.creating = true; })
      .addCase(createCustomerAndLink.fulfilled, (state) => { state.creating = false; })
      .addCase(createCustomerAndLink.rejected, (state) => { state.creating = false; })
      .addCase(updateCustomer.pending, (state) => { state.saving = true; })
      .addCase(updateCustomer.fulfilled, (state) => { state.saving = false; })
      .addCase(updateCustomer.rejected, (state) => { state.saving = false; });
  },
});

export const { patchCustomer, restoreCustomer } = customersSlice.actions;
export default customersSlice.reducer;