import { useState, useEffect } from 'react';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';
import BoardHeader from './BoardHeader';
import { BoardHeaderProvider } from '../contexts/BoardHeaderContext';

export default function AppShell({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));

  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-expand on large screens, collapse on smaller
  useEffect(() => {
    if (!isMobile) {
      setCollapsed(!isLarge);
    }
  }, [isLarge, isMobile]);

  // Close mobile drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100dvh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <BoardHeaderProvider>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Mobile top bar */}
          {isMobile && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                height: 48,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                flexShrink: 0,
              }}
            >
              <IconButton
                size="small"
                onClick={() => setMobileOpen(true)}
                sx={{
                  color: 'text.secondary',
                  borderRadius: '6px',
                  p: 0.75,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <MenuIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
          )}

          {/* Page content area */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <BoardHeader />
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </BoardHeaderProvider>
    </Box>
  );
}