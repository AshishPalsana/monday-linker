import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mondayClient } from "../services/mondayAPI";
import { gql } from "@apollo/client";

export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue }) => {
    const query = gql`
      query GetCustomers {
        boards(ids: 18400951947) {
          id
          name
          groups {
            id
            title
          }
          columns {
            id
            title
            type
          }
          items_page(limit: 100) {
            items {
              id
              name
              group {
                id
                title
              }
              column_values {
                id
                text
                value
              }
              created_at
              updated_at
            }
          }
        }
      }
    `;
    try {
      const { data } = await mondayClient.query({
        query,
        fetchPolicy: "network-only",
      });
      const board = JSON.parse(JSON.stringify(data.boards[0]));
      return board;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const customersSlice = createSlice({
  name: "customers",
  initialState: {
    board: null,
    loading: false,
    error: null,
  },
  reducers: {},
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
      });
  },
});

export default customersSlice.reducer;
