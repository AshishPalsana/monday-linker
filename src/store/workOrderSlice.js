import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mondayClient } from '../services/mondayAPI';
import { gql } from '@apollo/client';

export const fetchWorkOrders = createAsyncThunk(
  'workOrders/fetchWorkOrders',
  async (_, { rejectWithValue }) => {
    const query = gql`
      query GetBoardData {
        boards(ids: 18402613691) {
          id
          name
          groups { id title }
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
                ... on StatusValue {
                  label
                  index
                }
                ... on BoardRelationValue {
                  display_value
                }
              }
              created_at
              updated_at
            }
          }
        }
      }
    `;
    try {
      const { data } = await mondayClient.query({ query });
      return data.boards[0];
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
    error: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchWorkOrders.pending, state => {
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
      });
  },
});

export default workOrderSlice.reducer;
