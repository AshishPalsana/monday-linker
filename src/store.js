
import { configureStore } from '@reduxjs/toolkit';

import workOrderReducer from './store/workOrderSlice';
import customersReducer from './store/customersSlice';
import locationsReducer from './store/locationsSlice';

const store = configureStore({
  reducer: {
    workOrders: workOrderReducer,
    customers: customersReducer,
    locations: locationsReducer,
  },
});

export default store;