import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import WorkOrdersBoard from './components/WorkOrdersBoard';
import CustomersBoard from './components/CustomersBoard';
import LocationsBoard from './components/LocationsBoard';
import EquipmentBoard from './components/Equipmentboard';
import AppShell from './components/AppShell';

export default function AppRouter() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/workorders" />} />
          <Route
            path="/workorders"
            element={
              <AppShell>
                <WorkOrdersBoard />
              </AppShell>
            }
          />
          <Route
            path="/customers"
            element={
              <AppShell>
                <CustomersBoard />
              </AppShell>
            }
          />
          <Route
            path="/locations"
            element={
              <AppShell>
                <LocationsBoard />
              </AppShell>
            }
          />
          <Route
            path="/equipment"
            element={
              <AppShell>
                <EquipmentBoard />
              </AppShell>
            }
          />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}