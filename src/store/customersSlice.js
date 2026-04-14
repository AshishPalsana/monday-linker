import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mondayClient } from "../services/monday/client";
import {
  createCustomer as svcCreateCustomer,
  updateCustomer as svcUpdateCustomer,
  setWorkOrderRelation,
  FETCH_BOARD_DATA,
} from "../services/monday";
import { BOARD_IDS, MONDAY_COLUMNS } from "../constants/index";
import { deepClone } from "../utils/cloneUtils";
import { optimisticUpdateRelation, revertRelation } from "./workOrderSlice";

const COL = MONDAY_COLUMNS.CUSTOMERS;

export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mondayClient.query({
        query: FETCH_BOARD_DATA,
        variables: { boardId: [BOARD_IDS.CUSTOMERS] },
        fetchPolicy: "network-only",
      });
      return deepClone(data.boards[0]);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (form, { dispatch, rejectWithValue }) => {
    try {
      const created = await svcCreateCustomer(form);
      await dispatch(fetchCustomers());
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createCustomerAndLink = createAsyncThunk(
  "customers/createAndLink",
  async ({ form, workOrderId }, { dispatch, rejectWithValue }) => {
    try {
      if (workOrderId) {
        dispatch(
          optimisticUpdateRelation({
            itemId: workOrderId,
            columnId: MONDAY_COLUMNS.WORK_ORDERS.CUSTOMER,
            displayText: form.name,
            linkedId: "__pending__",
          }),
        );
      }

      const created = await svcCreateCustomer(form);

      if (workOrderId && /^\d+$/.test(String(created.id))) {
        dispatch(
          optimisticUpdateRelation({
            itemId: workOrderId,
            columnId: MONDAY_COLUMNS.WORK_ORDERS.CUSTOMER,
            displayText: created.name,
            linkedId: created.id,
          }),
        );
        await setWorkOrderRelation(
          workOrderId,
          created.id,
          MONDAY_COLUMNS.WORK_ORDERS.CUSTOMER,
        );
      }

      await dispatch(fetchCustomers());
      return created;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const linkExistingCustomer = createAsyncThunk(
  "customers/linkExisting",
  async (
    { workOrderId, customerId, customerName, previousSnapshot },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(
      optimisticUpdateRelation({
        itemId: workOrderId,
        columnId: MONDAY_COLUMNS.WORK_ORDERS.CUSTOMER,
        displayText: customerName,
        linkedId: customerId,
      }),
    );
    try {
      await setWorkOrderRelation(
        workOrderId,
        customerId,
        MONDAY_COLUMNS.WORK_ORDERS.CUSTOMER,
      );
    } catch (e) {
      dispatch(
        revertRelation({
          itemId: workOrderId,
          columnId: MONDAY_COLUMNS.WORK_ORDERS.CUSTOMER,
          previousValue: previousSnapshot.value,
          previousText: previousSnapshot.text,
          previousDisplay: previousSnapshot.display_value,
        }),
      );
      return rejectWithValue(e.message);
    }
  },
);

export const updateCustomer = createAsyncThunk(
  "customers/update",
  async ({ customerId, form }, { dispatch, getState, rejectWithValue }) => {
    const items = getState().customers.board?.items_page?.items || [];
    const previousItem = items.find((i) => i.id === customerId);

    dispatch(customersSlice.actions.patchCustomer({ customerId, form }));

    try {
      await svcUpdateCustomer(customerId, form);
    } catch (e) {
      if (previousItem) {
        dispatch(
          customersSlice.actions.restoreCustomer({ customerId, previousItem }),
        );
      }
      return rejectWithValue(e.message);
    }
  },
);

const customersSlice = createSlice({
  name: "customers",
  initialState: {
    board: null,
    loading: false,
    creating: false,
    saving: false,
    error: null,
  },
  reducers: {
    patchCustomer(state, action) {
      const { customerId, form } = action.payload;
      if (!state.board) return;
      const item = state.board.items_page.items.find((i) => i.id === customerId);
      if (!item) return;

      if (form.name) item.name = form.name;

      const setCol = (colId, text) => {
        const col = item.column_values.find((cv) => cv.id === colId);
        if (col) col.text = text || "";
      };

      setCol(COL.EMAIL, form.email);
      setCol(COL.PHONE, form.phone);
      setCol(COL.ACCOUNT_NUMBER, form.accountNumber);
      setCol(COL.BILLING_ADDRESS, form.billingAddress);
      setCol(COL.BILLING_TERMS, form.billingTerms);
      setCol(COL.XERO_CONTACT_ID, form.xeroContactId);
      setCol(COL.NOTES, form.notes);

      const xeroSyncCol = item.column_values.find(
        (cv) => cv.id === COL.XERO_SYNC_STATUS,
      );
      if (xeroSyncCol) {
        xeroSyncCol.label = form.xeroSyncStatus || "";
        xeroSyncCol.text = form.xeroSyncStatus || "";
      }

      const statusCol = item.column_values.find((cv) => cv.id === COL.STATUS);
      if (statusCol) {
        statusCol.label = form.status || "";
        statusCol.text = form.status || "";
      }
    },
    restoreCustomer(state, action) {
      const { customerId, previousItem } = action.payload;
      if (!state.board) return;
      const idx = state.board.items_page.items.findIndex(
        (i) => i.id === customerId,
      );
      if (idx !== -1) {
        state.board.items_page.items[idx] = previousItem;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.board = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCustomer.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload;
      })
      .addCase(createCustomerAndLink.pending, (state) => {
        state.creating = true;
      })
      .addCase(createCustomerAndLink.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createCustomerAndLink.rejected, (state) => {
        state.creating = false;
      })
      .addCase(updateCustomer.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateCustomer.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(updateCustomer.rejected, (state) => {
        state.saving = false;
      });
  },
});

export const { patchCustomer, restoreCustomer } = customersSlice.actions;
export default customersSlice.reducer;