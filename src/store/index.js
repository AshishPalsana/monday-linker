import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import activeEntryReducer from './activeEntrySlice';
import workOrderReducer from './workOrderSlice';
import customersReducer from './customersSlice';
import locationsReducer from './locationsSlice';
import equipmentReducer from './equipmentslice';
import uiReducer from './uiSlice';
import integrationReducer from './integrationSlice';
import notificationMiddleware from './middleware/notificationMiddleware';

const ACTIVE_ENTRY_KEY = 'ml_active_entry_v1';

const store = configureStore({
  reducer: {
    auth:        authReducer,
    activeEntry: activeEntryReducer,
    workOrders:  workOrderReducer,
    customers:   customersReducer,
    locations:   locationsReducer,
    equipment:   equipmentReducer,
    ui:          uiReducer,
    integration: integrationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(notificationMiddleware),
});

store.subscribe(() => {
  const entry = store.getState().activeEntry;
  if (entry) {
    localStorage.setItem(ACTIVE_ENTRY_KEY, JSON.stringify(entry));
  } else {
    localStorage.removeItem(ACTIVE_ENTRY_KEY);
  }
});

export default store;
