import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  IconButton,
  Avatar,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { fetchLocations } from "../store/locationsSlice";
import { fetchCustomers } from "../store/customersSlice";
import { fetchWorkOrders } from "../store/workOrderSlice";
import { COL } from "../services/mondayMutations";
import StatusChip from "./StatusChip";
import LocationDrawer from "./LocationDrawer";
import AddItemRow from "./AddItemRow";
import { createLocation as createLocationThunk } from "../store/locationsSlice";

// Shared header cell style — no wrapping ever
const HEAD_CELL = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "text.secondary",
  bgcolor: "background.paper",
  borderBottom: "1px solid",
  borderColor: "divider",
  py: 1,
  px: 1.5,
};

// Shared data cell style — truncate with ellipsis
const DATA_CELL = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: "0.75rem",
  color: "text.secondary",
  py: "7px",
  px: 1.5,
  maxWidth: 0,
};

const DASH = <span style={{ color: "#9ba6b4" }}>—</span>;

function TruncCell({ value, sx }) {
  if (!value) return <TableCell sx={{ ...DATA_CELL, ...sx }}>{DASH}</TableCell>;
  return (
    <Tooltip title={value} placement="top" enterDelay={600} arrow>
      <TableCell sx={{ ...DATA_CELL, ...sx }}>
        <span
          style={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
      </TableCell>
    </Tooltip>
  );
}

export default function LocationsBoard({ createLocation }) {
  const dispatch = useDispatch();
  const { board: locBoard, loading, error } = useSelector((s) => s.locations);
  const custBoard = useSelector((s) => s.customers.board);

  const [openDialog, setOpenDialog] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchCustomers());
    dispatch(fetchWorkOrders());
  }, [dispatch]);

  // Get a column value by its real Monday column ID
  const getCol = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return "";
    if (col.label && col.label.trim()) return col.label;
    if (col.text && col.text.trim()) return col.text;
    if (col.display_value && col.display_value.trim()) return col.display_value;
    return "";
  };

  // Resolve linked customer name from the Customers board relation column
  const getCustomerName = (item) => {
    const col = item.column_values?.find(
      (cv) => cv.id === COL.LOCATIONS.CUSTOMERS_REL,
    );
    if (!col) return "";
    return col.display_value || col.text || "";
  };

  // Resolve linked names from any board relation column (returns comma-separated string)
  const getRelationNames = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return "";
    return col.display_value || col.text || "";
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }
  if (error) return <Box sx={{ p: 3 }}>Error: {error}</Box>;
  if (!locBoard) return null;

  const allLocations = locBoard.items_page.items;
  const groups = locBoard.groups || [];

  // Filter items by search once
  const filteredLocations = allLocations.filter(loc => 
    !search || loc.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group items by group.id
  const locationsByGroup = filteredLocations.reduce((acc, loc) => {
    const groupId = loc.group?.id || 'default';
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(loc);
    return acc;
  }, {});

  const handleNew = () => {
    setOpenDialog({ id: '__new__', name: '', column_values: [] });
  };

  const renderTable = (rows, label, color) => (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <Box
          sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: color }}
        />
        <Typography
          variant="subtitle2"
          sx={{ color, fontSize: "0.8rem", fontWeight: 700 }}
        >
          {label}
        </Typography>
        <Chip
          label={rows.length}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.65rem",
            fontWeight: 700,
            bgcolor: color + "22",
            color,
            border: `1px solid ${color}44`,
          }}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table
            size="small"
            stickyHeader
            sx={{ borderCollapse: 'separate', tableLayout: 'fixed', minWidth: 1600 }}
          >
            <colgroup><col style={{ width: 200 }} /><col style={{ width: 220 }} /><col style={{ width: 130 }} /><col style={{ width: 80 }}  /><col style={{ width: 80 }}  /><col style={{ width: 130 }} /><col style={{ width: 250 }} /><col style={{ width: 160 }} /><col style={{ width: 160 }} /><col style={{ width: 160 }} /></colgroup>
            <TableHead>
              <TableRow>
                <TableCell sx={HEAD_CELL}>Location Name</TableCell>
                <TableCell sx={HEAD_CELL}>Street Address</TableCell>
                <TableCell sx={HEAD_CELL}>City</TableCell>
                <TableCell sx={HEAD_CELL}>State</TableCell>
                <TableCell sx={HEAD_CELL}>ZIP</TableCell>
                <TableCell sx={HEAD_CELL}>Status</TableCell>
                <TableCell sx={HEAD_CELL}>Notes</TableCell>
                <TableCell sx={HEAD_CELL}>Work Orders</TableCell>
                <TableCell sx={HEAD_CELL}>Customer</TableCell>
                <TableCell sx={HEAD_CELL}>Equipments</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    sx={{ textAlign: "center", py: 4, color: "text.disabled" }}
                  >
                    No locations
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((l) => {
                  const status = getCol(l, COL.LOCATIONS.STATUS);
                  const customerName = getCustomerName(l);
                  const workOrderNames = getRelationNames(
                    l,
                    COL.LOCATIONS.WORK_ORDERS_REL,
                  );
                  const equipmentNames = getRelationNames(
                    l,
                    COL.LOCATIONS.EQUIPMENTS_REL,
                  );

                  return (
                    <TableRow
                      key={l.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => setOpenDialog(l)}
                    >
                      {/* Location Name */}
                      <TableCell sx={{ ...DATA_CELL, py: "5px" }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            overflow: "hidden",
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 26,
                              height: 26,
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              flexShrink: 0,
                              bgcolor: "rgba(168,85,247,0.2)",
                              color: "#c084fc",
                            }}
                          >
                            {l.name.slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Tooltip
                            title={l.name}
                            placement="top"
                            enterDelay={600}
                            arrow
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.8rem",
                                color: "text.primary",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {l.name}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>

                      {/* Street Address */}
                      <TruncCell
                        value={getCol(l, COL.LOCATIONS.STREET_ADDRESS)}
                      />

                      {/* City */}
                      <TruncCell value={getCol(l, COL.LOCATIONS.CITY)} />

                      {/* State */}
                      <TruncCell value={getCol(l, COL.LOCATIONS.STATE)} />

                      {/* ZIP */}
                      <TruncCell value={getCol(l, COL.LOCATIONS.ZIP)} />

                      {/* Status chip */}
                      <TableCell sx={{ ...DATA_CELL, overflow: "visible" }}>
                        {status ? <StatusChip status={status} /> : DASH}
                      </TableCell>

                      {/* Notes */}
                      <TruncCell value={getCol(l, COL.LOCATIONS.NOTES)} />

                      {/* Work Orders */}
                      <TableCell sx={{ ...DATA_CELL, overflow: "visible" }}>
                        {workOrderNames ? (
                          <Tooltip
                            title={workOrderNames}
                            placement="top"
                            enterDelay={600}
                            arrow
                          >
                            <Chip
                              label={workOrderNames}
                              size="small"
                              sx={{
                                maxWidth: "100%",
                                fontSize: "0.72rem",
                                height: 22,
                                bgcolor: "rgba(79,142,247,0.08)",
                                color: "#4f8ef7",
                                border: "1px solid rgba(79,142,247,0.2)",
                              }}
                            />
                          </Tooltip>
                        ) : (
                          DASH
                        )}
                      </TableCell>

                      {/* Customer chip */}
                      <TableCell sx={{ ...DATA_CELL, overflow: "visible" }}>
                        {customerName ? (
                          <Tooltip
                            title={customerName}
                            placement="top"
                            enterDelay={600}
                            arrow
                          >
                            <Chip
                              label={customerName}
                              size="small"
                              sx={{
                                maxWidth: "100%",
                                fontSize: "0.72rem",
                                height: 22,
                                bgcolor: "rgba(79,142,247,0.1)",
                                color: "primary.light",
                                border: "1px solid rgba(79,142,247,0.2)",
                              }}
                            />
                          </Tooltip>
                        ) : (
                          DASH
                        )}
                      </TableCell>

                      {/* Equipments */}
                      <TableCell sx={{ ...DATA_CELL, overflow: "visible" }}>
                        {equipmentNames ? (
                          <Tooltip
                            title={equipmentNames}
                            placement="top"
                            enterDelay={600}
                            arrow
                          >
                            <Chip
                              label={equipmentNames}
                              size="small"
                              sx={{
                                maxWidth: "100%",
                                fontSize: "0.72rem",
                                height: 22, 
                                bgcolor: "rgba(34,197,94,0.08)",
                                color: "#16a34a",
                                border: "1px solid rgba(34,197,94,0.2)",
                              }}
                            />
                          </Tooltip>
                        ) : (
                          DASH
                        )}
                      </TableCell>

                      {/* Edit */}
                    </TableRow>
                  );
                })
              )}

            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              fontSize: "1.25rem",
              letterSpacing: "-0.3px",
            }}
          >
            Locations
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredLocations.length} total locations
          </Typography>
        </Box>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}
        >
          <TextField
            size="small"
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon
                  sx={{ fontSize: 16, color: "text.disabled", mr: 0.5 }}
                />
              ),
            }}
            sx={{ 
              width: 260,
              '& .MuiOutlinedInput-root': {
                height: 40,
                borderRadius: '8px',
                bgcolor: '#fff',
              }
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNew}
            sx={{ 
              height: 40, 
              px: 3, 
              borderRadius: '8px', 
              textTransform: 'none', 
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none', bgcolor: 'primary.dark' }
            }}
          >
            New location
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
        {groups.map((group) => {
          const rows = locationsByGroup[group.id] || [];
          return renderTable(rows, group.title, group.color || "#6b7280");
        })}
      </Box>

      {openDialog && (
        <LocationDrawer
          open={true}
          location={openDialog}
          onClose={() => setOpenDialog(null)}
          onSaveNew={async (form) => {
            await dispatch(createLocationThunk(form));
            setOpenDialog(null);
          }}
        />
      )}
    </Box>
  );
}
