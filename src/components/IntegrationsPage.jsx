import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Stack,
  Alert,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { customerApi } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function IntegrationsPage() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [xeroStatus, setXeroStatus] = useState(null);
  const [error, setError] = useState(null);
  const [syncingCustomers, setSyncingCustomers] = useState(false);
  const [customerSyncResult, setCustomerSyncResult] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/xero/status`);

      setXeroStatus({
        connected: response.data.connected,
        tenantName: response.data.tenantName,
        lastSync: response.data.connected ? 'Tracking active' : 'Awaiting setup',
      });
    } catch (err) {
      console.error('Failed to fetch integration status:', err);
      setError('Could not reach the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectXero = () => {
    // Open OAuth in a new popup so Xero's page is not constrained by the
    // Monday.com iframe (Xero blocks iframe embedding and returns a 500).
    const popup = window.open(
      `${API_URL}/api/xero/connect`,
      'xero_connect',
      'width=800,height=700,left=200,top=100,resizable=yes,scrollbars=yes'
    );

    // Listen for the success message that the callback page posts back
    function onMessage(event) {
      if (event.data?.type === 'xero_connected') {
        window.removeEventListener('message', onMessage);
        popup?.close();
        fetchStatus();
      }
    }
    window.addEventListener('message', onMessage);

    // Fallback: poll until the popup closes, then refresh status
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        window.removeEventListener('message', onMessage);
        fetchStatus();
      }
    }, 1000);
  };

  const handleDisconnectXero = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/xero/disconnect`);
      await fetchStatus();
    } catch (err) {
      console.error('Failed to disconnect Xero:', err);
      setError('Failed to disconnect Xero account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCustomers = async () => {
    setSyncingCustomers(true);
    setCustomerSyncResult(null);
    try {
      const { data } = await customerApi.syncAll(auth?.token);
      setCustomerSyncResult({ success: true, ...data });
    } catch (err) {
      setCustomerSyncResult({ success: false, error: err.message });
    } finally {
      setSyncingCustomers(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Integrations
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
        Manage your connections to third-party services and accounting platforms.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Stack spacing={3}>
        {/* Xero Integration Card */}
        <Card
          sx={{
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            overflow: 'visible',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: '#13b5ea',
                    width: 56,
                    height: 56,
                    borderRadius: '12px',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                  }}
                >
                  X
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Xero {xeroStatus?.tenantName ? `(${xeroStatus.tenantName})` : ''}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400 }}>
                    Sync work orders as Projects in Xero to track costs and bill your customers efficiently.
                  </Typography>
                </Box>
              </Box>
              <Chip
                icon={xeroStatus?.connected ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                label={xeroStatus?.connected ? 'Connected' : 'Not Connected'}
                color={xeroStatus?.connected ? 'success' : 'default'}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SyncIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {xeroStatus?.connected ? 'Tracking active' : 'Awaiting setup'}
                </Typography>
              </Box>

              {xeroStatus?.connected ? (
                <Button variant="outlined" color="error" size="small" sx={{ borderRadius: '6px' }} onClick={handleDisconnectXero}>
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleConnectXero}
                  sx={{
                    bgcolor: '#13b5ea',
                    '&:hover': { bgcolor: '#0f9ac8' },
                    borderRadius: '6px',
                    px: 3,
                    fontWeight: 600,
                  }}
                >
                  Connect to Xero
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Customer Backfill Card — only visible when Xero is connected */}
        {xeroStatus?.connected && (
          <Card
            sx={{
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 44, height: 44, borderRadius: '10px' }}>
                  <PeopleOutlineIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    Sync Existing Customers to Xero
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Links all customers already on the Monday Customers board to their Xero Contact.
                    Customers that already exist in Xero are matched by account number or name - no duplicates created.
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {customerSyncResult && (
                <Alert
                  severity={customerSyncResult.success ? (customerSyncResult.errors?.length ? 'warning' : 'success') : 'error'}
                  sx={{ mb: 2, fontSize: '0.8rem' }}
                >
                  {customerSyncResult.success
                    ? `Done — ${customerSyncResult.synced} synced, ${customerSyncResult.skipped} already linked${customerSyncResult.errors?.length ? `, ${customerSyncResult.errors.length} errors` : ''}`
                    : `Sync failed: ${customerSyncResult.error}`}
                </Alert>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={syncingCustomers ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
                  onClick={handleSyncCustomers}
                  disabled={syncingCustomers}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '6px' }}
                >
                  {syncingCustomers ? 'Syncing…' : 'Sync Customers to Xero'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
