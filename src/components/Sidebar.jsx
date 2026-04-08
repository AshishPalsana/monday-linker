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
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BuildIcon from "@mui/icons-material/Build";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { NavLink } from "react-router-dom";
import { useSelector } from 'react-redux';
import { useAuth } from "../hooks/useAuth";

export const SIDEBAR_EXPANDED_WIDTH = 230;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

const NAV_MAIN = [
  { id: "workorders", icon: AssignmentIcon, label: "Work Orders", path: "/workorders" },
  { id: "customers",  icon: PeopleIcon,     label: "Customers",   path: "/customers"  },
  { id: "equipment",  icon: BuildIcon,      label: "Equipment",   path: "/equipment"  },
  { id: "locations",  icon: LocationOnIcon, label: "Locations",   path: "/locations"  },
];

const NAV_TIME = [
  { id: "time-tracker", icon: TimerOutlinedIcon,      label: "Time Tracker", path: "/time-tracker" },
  { id: "time-board",   icon: TableChartOutlinedIcon, label: "Time Board",   path: "/time-board"   },
];

function NavItem({ id, icon: Icon, label, path, collapsed, clockedIn }) {
  return (
    <NavLink to={path} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <Tooltip
          title={collapsed ? label : ""}
          placement="right"
          arrow
          disableHoverListener={!collapsed}
        >
          <ListItemButton
            sx={{
              borderRadius: 0.7,
              px: collapsed ? 1.25 : 1.5,
              py: 0.9,
              mb: 0.3,
              minHeight: 38,
              justifyContent: collapsed ? "center" : "flex-start",
              transition: "all 0.15s ease",
              bgcolor: isActive ? "rgba(79,142,247,0.12)" : "transparent",
              "&:hover": { bgcolor: "#f7f7f7" },
              "& .MuiListItemIcon-root": {
                minWidth: collapsed ? "auto" : 32,
                color: isActive ? "#111" : "#777",
              },
              "& .MuiListItemText-primary": {
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#111" : "#555",
              },
            }}
          >
            <ListItemIcon sx={{ position: "relative" }}>
              <Icon sx={{ fontSize: 18 }} />
            </ListItemIcon>

            {!collapsed && (
              <ListItemText
                primary={
                  id === "time-tracker" && clockedIn ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 0.5,
                      }}
                    >
                      <span>{label}</span>
                      <Box
                        sx={{
                          fontSize: "0.58rem",
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          color: "#22c55e",
                          bgcolor: "rgba(34,197,94,0.12)",
                          border: "1px solid rgba(34,197,94,0.3)",
                          borderRadius: 0.75,
                          px: 0.6,
                          py: 0.15,
                          lineHeight: 1.5,
                        }}
                      >
                        LIVE
                      </Box>
                    </Box>
                  ) : (
                    label
                  )
                }
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
  const { auth } = useAuth();
  const isAdmin = auth?.technician?.isAdmin ?? false;
  // Temporarily show Time Board for all users during testing
  // const visibleTimeNav = NAV_TIME.filter((item) => item.id !== "time-board" || isAdmin);
  const visibleTimeNav = NAV_TIME;

  return (
    <Box
      sx={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        minWidth: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        transition: "width 0.22s ease, min-width 0.22s ease",
      }}
    >
      {/* Brand + toggle row */}
      <Box
        sx={{
          px: collapsed ? 1 : 2.5,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 60,
        }}
      >
        {!collapsed && (
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: "1rem",
                letterSpacing: "-0.3px",
                lineHeight: 1.1,
              }}
            >
              Aaroneq
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.disabled",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                fontSize: "0.65rem",
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
            width: 28,
            height: 28,
            color: "#999",
            bgcolor: "#f5f5f5",
            borderRadius: 0.75,
            flexShrink: 0,
            "&:hover": { bgcolor: "#ebebeb", color: "#333" },
          }}
        >
          {collapsed
            ? <ChevronRightIcon sx={{ fontSize: 16 }} />
            : <ChevronLeftIcon  sx={{ fontSize: 16 }} />
          }
        </IconButton>
      </Box>

      <Divider />

      {/* Main nav */}
      <Box sx={{ pt: 1.5 }}>
        {!collapsed && (
          <Typography
            variant="subtitle2"
            sx={{ px: 2.5, pb: 0.5, color: "text.disabled", fontSize: "0.68rem" }}
          >
            Main
          </Typography>
        )}
        <List dense disablePadding sx={{ px: collapsed ? 0.5 : 1 }}>
          {NAV_MAIN.map((item) => (
            <NavItem key={item.id} {...item} collapsed={collapsed} clockedIn={clockedIn} />
          ))}
        </List>
      </Box>

      <Divider sx={{ mt: 1 }} />

      {/* Time & Labor nav */}
      <Box sx={{ pt: 1.5 }}>
        {!collapsed && (
          <Typography
            variant="subtitle2"
            sx={{ px: 2.5, pb: 0.5, color: "text.disabled", fontSize: "0.68rem" }}
          >
            {"Time & Labor"}
          </Typography>
        )}
        <List dense disablePadding sx={{ px: collapsed ? 0.5 : 1 }}>
          {visibleTimeNav.map((item) => (
            <NavItem key={item.id} {...item} collapsed={collapsed} clockedIn={clockedIn} />
          ))}
        </List>
      </Box>
    </Box>
  );
}

/**
 * Sidebar
 *   collapsed     - icon-only mode (desktop)
 *   onToggle      - flip collapsed
 *   mobileOpen    - mobile drawer open flag
 *   onMobileClose - close mobile drawer
 */
export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  return (
    <>
      {/* Permanent sidebar - md and up */}
      <Box sx={{ display: { xs: "none", md: "flex" } }}>
        <SidebarContent collapsed={collapsed} onToggle={onToggle} />
      </Box>

      {/* Temporary drawer - mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: SIDEBAR_EXPANDED_WIDTH,
            border: "none",
          },
        }}
      >
        <SidebarContent collapsed={false} onToggle={onMobileClose} />
      </Drawer>
    </>
  );
}
