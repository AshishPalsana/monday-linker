import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'ml_active_entries_v2';

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { Job: null, NonJob: null };
  } catch {
    return { Job: null, NonJob: null };
  }
}

const activeEntrySlice = createSlice({
  name: 'activeEntry',
  initialState: readStorage(),
  reducers: {
    setActiveEntry(state, action) {
      const { type, entry } = action.payload; // type: 'Job' | 'NonJob'
      state[type] = entry;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    clearActiveEntry(state, action) {
      const type = action.payload;
      if (type) {
        state[type] = null;
      } else {
        // Clear all if no type provided
        state.Job = null;
        state.NonJob = null;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
  },
});

export const { setActiveEntry, clearActiveEntry } = activeEntrySlice.actions;
export default activeEntrySlice.reducer;
