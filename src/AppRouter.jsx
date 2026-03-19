
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import WorkOrdersBoard from './components/WorkOrdersBoard';
import CustomersBoard from './components/CustomersBoard';
import LocationsBoard from './components/LocationsBoard';
import AppShell from './components/AppShell';

export default function AppRouter({ data, updateData, createCustomer, createLocation }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/workorders" />} />
          <Route
            path="/workorders"
            element={
              <AppShell>
                <WorkOrdersBoard
                  data={data}
                  updateData={updateData}
                  createCustomer={createCustomer}
                  createLocation={createLocation}
                />
              </AppShell>
            }
          />
          <Route
            path="/customers"
            element={
              <AppShell>
                <CustomersBoard
                  data={data}
                  updateData={updateData}
                  createCustomer={createCustomer}
                />
              </AppShell>
            }
          />
          <Route
            path="/locations"
            element={
              <AppShell>
                <LocationsBoard
                  data={data}
                  updateData={updateData}
                  createLocation={createLocation}
                />
              </AppShell>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
