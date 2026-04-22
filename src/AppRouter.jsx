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
  const { auth, authLoading } = useAuth();
  if (authLoading) return null;
  const isAdmin = auth?.technician?.isAdmin ?? false;
  return <Navigate to={isAdmin ? '/workorders' : '/time-tracker'} replace />;
}

// Admin-only: redirect non-admins to time-tracker instead of blocking entirely
function AdminRedirect({ children }) {
  const { auth, authLoading } = useAuth();
  if (authLoading) return null;
  const isAdmin = auth?.technician?.isAdmin ?? false;
  return isAdmin ? children : <Navigate to="/time-tracker" replace />;
}

// Tech-only: redirect admins to workorders
function TechRedirect({ children }) {
  const { auth, authLoading } = useAuth();
  if (authLoading) return null;
  const isAdmin = auth?.technician?.isAdmin ?? false;
  return isAdmin ? <Navigate to="/workorders" replace /> : children;
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

                {/* All users can view boards (read-only enforced inside each board/drawer) */}
                <Route path="/workorders/:id?" element={<AppShell><WorkOrdersBoard /></AppShell>} />
                <Route path="/customers/:id?" element={<AppShell><CustomersBoard /></AppShell>} />
                <Route path="/locations/:id?" element={<AppShell><LocationsBoard /></AppShell>} />
                <Route path="/equipment/:id?" element={<AppShell><EquipmentBoard /></AppShell>} />
                <Route path="/master-costs" element={<AppShell><MasterCostsBoard /></AppShell>} />
                <Route path="/time-board" element={<AppShell><TimeBoard /></AppShell>} />

                {/* Time Tracker: non-admins only (admins use Time Board) */}
                <Route
                  path="/time-tracker"
                  element={
                    <TechRedirect>
                      <AppShell>
                        <TimeTrackingPage />
                      </AppShell>
                    </TechRedirect>
                  }
                />

                {/* Settings: admin only */}
                <Route path="/settings/integrations" element={<AdminRedirect><AppShell><IntegrationsPage /></AppShell></AdminRedirect>} />
              </Routes>
            </HashRouter>
          </SocketProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}