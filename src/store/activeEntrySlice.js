import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'ml_active_entry_v1';

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const activeEntrySlice = createSlice({
  name: 'activeEntry',
  initialState: readStorage(),
  reducers: {
    setActiveEntry(_, action) {
      return action.payload;
    },
    clearActiveEntry() {
      return null;
    },
  },
});

export const { setActiveEntry, clearActiveEntry } = activeEntrySlice.actions;
export default activeEntrySlice.reducer;
