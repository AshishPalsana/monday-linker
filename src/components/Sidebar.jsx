import {
  Box,
  List,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  ListItemButton,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BuildIcon from "@mui/icons-material/Build";
import { NavLink } from "react-router-dom";

const NAV_MAIN = [
  {
    id: "workorders",
    icon: AssignmentIcon,
    label: "Work Orders",
    path: "/workorders",
  },
  { id: "customers", icon: PeopleIcon, label: "Customers", path: "/customers" },
  {
    id: "equipment", icon: BuildIcon, label: "Equipment", path: "/equipment",
  },
  {
    id: "locations",
    icon: LocationOnIcon,
    label: "Locations",
    path: "/locations",
  },
];

export default function Sidebar() {
  return (
    <Box
      sx={{
        width: 230,
        minWidth: 230,
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
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
      </Box>

      <Divider />

      <Box sx={{ pt: 1.5 }}>
        <Typography
          variant="subtitle2"
          sx={{ px: 2.5, pb: 0.5, color: "text.disabled", fontSize: "0.68rem" }}
        >
          Main
        </Typography>
        <List dense disablePadding sx={{ px: 1 }}>
          {NAV_MAIN.map(({ id, icon: Icon, label, path }) => (
            <NavLink
              key={id}
              to={path}
              style={{ textDecoration: "none" }}
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              {({ isActive }) => (
                <ListItemButton
                  sx={{
                    borderRadius: 0.7,
                    px: 1.5,
                    py: 0.9,
                    mb: 0.3,
                    transition: "all 0.15s ease",

                    bgcolor: isActive ? "rgba(79,142,247,0.12)" : "transparent",

                    "&:hover": {
                      bgcolor: "#f7f7f7",
                    },

                    "& .MuiListItemIcon-root": {
                      minWidth: 32,
                      color: isActive ? "#111" : "#777",
                    },

                    "& .MuiListItemText-primary": {
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#111" : "#555",
                    },
                  }}
                >
                  <ListItemIcon>
                    <Icon sx={{ fontSize: 18 }} />
                  </ListItemIcon>

                  <ListItemText primary={label} />
                </ListItemButton>
              )}
            </NavLink>
          ))}
        </List>
      </Box>
    </Box>
  );
}