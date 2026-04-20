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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [xeroStatus, setXeroStatus] = useState(null);
  const [error, setError] = useState(null);

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
    // Redirect to backend connect endpoint
    window.location.href = `${API_URL}/api/xero/connect`;
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

        {/* Placeholder for future integrations */}
        <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: '12px', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.disabled' }}>
            More Integrations Coming Soon
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            We're working on connecting to QuickBooks, ServiceM8, and more.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
