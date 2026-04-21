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
import MasterCostsBoard from './components/MasterCostsBoard';
import IntegrationsPage from './components/IntegrationsPage';
import { AuthProvider } from './providers/AuthProvider';
import { SocketProvider } from './providers/SocketProvider';
import { useAuth } from './hooks/useAuth';

import { SnackbarProvider } from 'notistack';
import NotificationManager from './components/NotificationManager';

// Redirects to role-appropriate landing page
function DefaultRedirect() {
  const { auth } = useAuth();
  const isAdmin = auth?.technician?.isAdmin ?? false;
  return <Navigate to={isAdmin ? '/workorders' : '/time-tracker'} replace />;
}

// Blocks non-admin users from admin-only routes
function AdminRoute({ children }) {
  const { auth } = useAuth();
  const isAdmin = auth?.technician?.isAdmin ?? false;
  return isAdmin ? children : <Navigate to="/time-tracker" replace />;
}

// Blocks admin users from the time-tracker (admin uses Time Board instead)
function TechRoute({ children }) {
  const { auth } = useAuth();
  const isAdmin = auth?.technician?.isAdmin ?? false;
  return !isAdmin ? children : <Navigate to="/workorders" replace />;
}

export default function AppRouter() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={2000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <NotificationManager />
        <AuthProvider>
          <SocketProvider>
            <HashRouter>
              <Routes>
                <Route path="/" element={<DefaultRedirect />} />

                {/* Admin-only pages */}
                <Route path="/workorders/:id?"       element={<AdminRoute><AppShell><WorkOrdersBoard /></AppShell></AdminRoute>} />
                <Route path="/customers/:id?"        element={<AdminRoute><AppShell><CustomersBoard /></AppShell></AdminRoute>} />
                <Route path="/locations/:id?"        element={<AdminRoute><AppShell><LocationsBoard /></AppShell></AdminRoute>} />
                <Route path="/equipment/:id?"        element={<AdminRoute><AppShell><EquipmentBoard /></AppShell></AdminRoute>} />
                <Route path="/master-costs"          element={<AdminRoute><AppShell><MasterCostsBoard /></AppShell></AdminRoute>} />
                <Route path="/time-board"            element={<AdminRoute><AppShell><TimeBoard /></AppShell></AdminRoute>} />
                <Route path="/settings/integrations" element={<AdminRoute><AppShell><IntegrationsPage /></AppShell></AdminRoute>} />

                {/* Technician-only page */}
                <Route path="/time-tracker" element={<TechRoute><AppShell><TimeTrackingPage /></AppShell></TechRoute>} />
              </Routes>
            </HashRouter>
          </SocketProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}