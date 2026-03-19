import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mondayClient } from '../services/mondayAPI';
import { gql } from '@apollo/client';

export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    const query = gql`
      query GetLocations {
        boards(ids: 18400965227) {
          id
          name
          groups { id title }
          columns { id title type }
          items_page(limit: 200) {
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

const locationsSlice = createSlice({
  name: 'locations',
  initialState: {
    board: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchLocations.pending, state => {
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
      });
  },
});

export default locationsSlice.reducer;
