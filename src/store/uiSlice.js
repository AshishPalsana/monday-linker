import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    notifications: [],
  },
  reducers: {
    /**
     * @param {Object} action.payload
     * @param {string} action.payload.message
     * @param {string} action.payload.variant - 'success' | 'error' | 'warning' | 'info'
     * @param {string} action.payload.key - Unique key for the notification
     */
    addNotification: (state, action) => {
      state.notifications.push({
        ...action.payload,
        key: action.payload.key || new Date().getTime() + Math.random(),
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.key !== action.payload,
      );
    },
  },
});

export const { addNotification, removeNotification } = uiSlice.actions;
export default uiSlice.reducer;
