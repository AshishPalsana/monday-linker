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
import { AuthProvider } from './providers/AuthProvider';
import { SocketProvider } from './providers/SocketProvider';

import { SnackbarProvider } from 'notistack';
import NotificationManager from './components/NotificationManager';

export default function AppRouter() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <NotificationManager />
        <AuthProvider>
          <SocketProvider>
            <HashRouter>
              <Routes>
                <Route path="/"            element={<Navigate to="/workorders" />} />
                <Route path="/workorders/:id?"  element={<AppShell><WorkOrdersBoard /></AppShell>} />
                <Route path="/customers/:id?"   element={<AppShell><CustomersBoard /></AppShell>} />
                <Route path="/locations/:id?"   element={<AppShell><LocationsBoard /></AppShell>} />
                <Route path="/equipment/:id?"   element={<AppShell><EquipmentBoard /></AppShell>} />
                <Route path="/time-tracker" element={<AppShell><TimeTrackingPage /></AppShell>} />
                <Route path="/time-board"   element={<AppShell><TimeBoard /></AppShell>} />
              </Routes>
            </HashRouter>
          </SocketProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}