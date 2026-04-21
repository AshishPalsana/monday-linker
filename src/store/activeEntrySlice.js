import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'ml_active_entries_v2';

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { Job: null, NonJob: null, DailyShift: null };
  } catch {
    return { Job: null, NonJob: null, DailyShift: null };
  }
}

const activeEntrySlice = createSlice({
  name: 'activeEntry',
  initialState: readStorage(),
  reducers: {
    setActiveEntry(state, action) {
      const { type, entry } = action.payload; // type: 'Job' | 'NonJob' | 'DailyShift'
      state[type] = { ...entry, expenses: entry?.expenses || [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    addActiveExpense(state, action) {
      const { type, expense } = action.payload; // type: 'Job' | 'NonJob'
      if (state[type]) {
        if (!state[type].expenses) state[type].expenses = [];
        state[type].expenses.push({ ...expense, id: Date.now() });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    },
    clearActiveEntry(state, action) {
      const type = action.payload;
      if (type) {
        state[type] = null;
      } else {
        // Clear all except DailyShift unless specifically requested?
        // Actually, the user says "End Day" clears everything usually.
        state.Job = null;
        state.NonJob = null;
        state.DailyShift = null;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
  },
});

export const { setActiveEntry, clearActiveEntry, addActiveExpense } = activeEntrySlice.actions;
export default activeEntrySlice.reducer;
