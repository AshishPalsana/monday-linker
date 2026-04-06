import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import WorkOrdersBoard from './components/WorkOrdersBoard';
import CustomersBoard from './components/CustomersBoard';
import LocationsBoard from './components/LocationsBoard';
import EquipmentBoard from './components/Equipmentboard';
import AppShell from './components/AppShell';
import TimeTrackingPage from './components/TimeTrackingPage';
import TimeBoard from './components/TimeBoard';
import { ClockProvider } from './store/clockContext';
import { AuthProvider, useAuth } from './store/authContext';
import { ActiveEntryProvider } from './store/activeEntryContext';

// Separate component so ActiveEntryProvider can consume useAuth()
function AppProviders({ children }) {
  const { auth } = useAuth();
  return (
    <ActiveEntryProvider auth={auth}>
      <ClockProvider>
        {children}
      </ClockProvider>
    </ActiveEntryProvider>
  );
}

export default function AppRouter() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppProviders>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/workorders" />} />
              <Route path="/workorders" element={<AppShell><WorkOrdersBoard /></AppShell>} />
              <Route path="/customers"  element={<AppShell><CustomersBoard /></AppShell>} />
              <Route path="/locations"  element={<AppShell><LocationsBoard /></AppShell>} />
              <Route path="/equipment"  element={<AppShell><EquipmentBoard /></AppShell>} />
              <Route path="/time-tracker" element={<AppShell><TimeTrackingPage /></AppShell>} />
              <Route path="/time-board"   element={<AppShell><TimeBoard /></AppShell>} />
            </Routes>
          </HashRouter>
        </AppProviders>
      </AuthProvider>
    </ThemeProvider>
  );
}