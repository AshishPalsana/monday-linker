import {
  Box,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  ListItemButton,
  IconButton,
  Tooltip,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BuildIcon from '@mui/icons-material/Build';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';

export const SIDEBAR_EXPANDED_WIDTH = 224;
export const SIDEBAR_COLLAPSED_WIDTH = 52;

const NAV_MAIN = [
  { id: 'workorders', icon: AssignmentIcon, label: 'Work Orders', path: '/workorders' },
  { id: 'customers', icon: PeopleIcon, label: 'Customers', path: '/customers' },
  { id: 'equipment', icon: BuildIcon, label: 'Equipment', path: '/equipment' },
  { id: 'locations', icon: LocationOnIcon, label: 'Locations', path: '/locations' },
  { id: 'master-costs', icon: ReceiptLongIcon, label: 'Master Costs', path: '/master-costs' },
];

const NAV_TIME = [
  { id: 'time-tracker', icon: TimerOutlinedIcon, label: 'Time Tracker', path: '/time-tracker' },
  { id: 'time-board', icon: TableChartOutlinedIcon, label: 'Time Board', path: '/time-board' },
];

const NAV_SETTINGS = [
  { id: 'integrations', icon: BuildIcon, label: 'Integrations', path: '/settings/integrations' },
];

function SectionLabel({ collapsed, children }) {
  if (collapsed) return null;
  return (
    <Typography
      sx={{
        px: 2,
        pb: 0.5,
        pt: 0.25,
        fontSize: '0.63rem',
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'text.disabled',
      }}
    >
      {children}
    </Typography>
  );
}

function NavItem({ id, icon: Icon, label, path, collapsed, clockedIn }) {
  return (
    <NavLink to={path} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Tooltip
          title={collapsed ? label : ''}
          placement="right"
          arrow
          disableHoverListener={!collapsed}
        >
          <ListItemButton
            sx={{
              borderRadius: '5px',
              px: collapsed ? 0 : 1.25,
              py: '7px',
              mb: 0.25,
              minHeight: 36,
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'background 0.12s',
              bgcolor: isActive ? 'rgba(79,142,247,0.1)' : 'transparent',
              '&:hover': {
                bgcolor: isActive ? 'rgba(79,142,247,0.14)' : 'action.hover',
              },
              '& .MuiListItemIcon-root': {
                minWidth: collapsed ? 'auto' : 30,
                color: isActive ? 'primary.main' : 'text.secondary',
              },
            }}
          >
            <ListItemIcon>
              <Icon sx={{ fontSize: 17 }} />
            </ListItemIcon>

            {!collapsed && (
              <ListItemText
                primary={
                  id === 'time-tracker' && clockedIn ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                      <span>{label}</span>
                      <Box
                        sx={{
                          fontSize: '0.55rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          color: '#16a34a',
                          bgcolor: 'rgba(22,163,74,0.1)',
                          border: '1px solid rgba(22,163,74,0.25)',
                          borderRadius: '3px',
                          px: '5px',
                          py: '1px',
                          lineHeight: 1.6,
                        }}
                      >
                        LIVE
                      </Box>
                    </Box>
                  ) : (
                    label
                  )
                }
                primaryTypographyProps={{
                  sx: {
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'text.primary' : 'text.secondary',
                    lineHeight: 1,
                  },
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      )}
    </NavLink>
  );
}

function SidebarContent({ collapsed, onToggle }) {
  const clockedIn = useSelector((state) => !!state.activeEntry);
  const { auth, authLoading } = useAuth();
  
  if (authLoading) return null;
  
  const isAdmin = auth?.technician?.isAdmin ?? false;

  // Non-admin: "Dashboard" (time-tracker) shown first; no Time Board
  // Admin: full Main section; Time Board in Time & Labor; no Time Tracker
  const dashboardItem = { id: 'time-tracker', icon: TimerOutlinedIcon, label: 'Dashboard', path: '/time-tracker' };
  const visibleMain     = NAV_MAIN;
  const visibleTimeNav  = isAdmin
    ? NAV_TIME.filter((n) => n.id !== 'time-tracker')
    : [];
  const visibleSettings = isAdmin ? NAV_SETTINGS : [];

  return (
    <Box
      sx={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        minWidth: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        transition: 'width 0.2s ease, min-width 0.2s ease',
      }}
    >
      {/* Brand header */}
      <Box
        sx={{
          px: collapsed ? 0 : 2,
          height: 58,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '-0.3px',
                lineHeight: 1.15,
                color: 'text.primary',
              }}
            >
              Aaroneq
            </Typography>
            <Typography
              sx={{
                color: 'text.disabled',
                letterSpacing: '0.06em',
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              Field Services
            </Typography>
          </Box>
        )}

        <IconButton
          onClick={onToggle}
          size="small"
          sx={{
            width: 26,
            height: 26,
            color: 'text.disabled',
            bgcolor: 'action.hover',
            borderRadius: '5px',
            flexShrink: 0,
            '&:hover': { bgcolor: 'action.selected', color: 'text.primary' },
          }}
        >
          {collapsed
            ? <ChevronRightIcon sx={{ fontSize: 15 }} />
            : <ChevronLeftIcon sx={{ fontSize: 15 }} />}
        </IconButton>
      </Box>

      <Divider />

      {/* Scrollable nav area */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', pt: 1.25 }}>

        {/* Non-admin: Dashboard first */}
        {!isAdmin && (
          <>
            <SectionLabel collapsed={collapsed}>Dashboard</SectionLabel>
            <List dense disablePadding sx={{ px: collapsed ? 0.5 : 0.75 }}>
              <NavItem {...dashboardItem} collapsed={collapsed} clockedIn={clockedIn} />
            </List>
            <Divider sx={{ my: 1.25 }} />
          </>
        )}

        {/* Main nav — all users */}
        <SectionLabel collapsed={collapsed}>Main</SectionLabel>
        <List dense disablePadding sx={{ px: collapsed ? 0.5 : 0.75 }}>
          {visibleMain.map((item) => (
            <NavItem key={item.id} {...item} collapsed={collapsed} clockedIn={clockedIn} />
          ))}
        </List>

        {/* Time & Labor — admin only (Time Board) */}
        {visibleTimeNav.length > 0 && (
          <>
            <Divider sx={{ my: 1.25 }} />
            <SectionLabel collapsed={collapsed}>Time & Labor</SectionLabel>
            <List dense disablePadding sx={{ px: collapsed ? 0.5 : 0.75 }}>
              {visibleTimeNav.map((item) => (
                <NavItem key={item.id} {...item} collapsed={collapsed} clockedIn={clockedIn} />
              ))}
            </List>
          </>
        )}

        {visibleSettings.length > 0 && (
          <>
            <Divider sx={{ my: 1.25 }} />
            <SectionLabel collapsed={collapsed}>Settings</SectionLabel>
            <List dense disablePadding sx={{ px: collapsed ? 0.5 : 0.75 }}>
              {visibleSettings.map((item) => (
                <NavItem key={item.id} {...item} collapsed={collapsed} clockedIn={clockedIn} />
              ))}
            </List>
          </>
        )}
      </Box>
    </Box>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  return (
    <>
      {/* Desktop permanent sidebar */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexShrink: 0 }}>
        <SidebarContent collapsed={collapsed} onToggle={onToggle} />
      </Box>

      {/* Mobile temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_EXPANDED_WIDTH,
            border: 'none',
            boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
          },
        }}
      >
        <SidebarContent collapsed={false} onToggle={onMobileClose} />
      </Drawer>
    </>
  );
}