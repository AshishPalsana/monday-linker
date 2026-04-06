import { useState } from 'react';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Desktop: collapsed = icon-only. Default expanded on lg+, collapsed on md.
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));
  const [collapsed, setCollapsed] = useState(!isLarge);

  // Mobile: drawer open/close
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              flexShrink: 0,
            }}
          >
            <IconButton
              size="small"
              onClick={() => setMobileOpen(true)}
              sx={{ color: '#555' }}
            >
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        )}

        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}